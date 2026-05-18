# Merkezi Loglama (Loki + Promtail)

Sadece local log tutmak troubleshooting degildir. Gercek operasyon icin:

- host loglari,
- Nginx loglari,
- uygulama loglari,
- deploy ve hata anlari

tek yerden sorgulanabilir olmali.

Bu rehber, hafif bir stack olan **Loki + Promtail + Grafana** ile merkezi loglamayi kurar.

## 1. Hedef Mimari

Akis:

1. `journald` host loglarini tutar
2. Promtail hosttan ve dosya loglarindan toplar
3. Loki loglari saklar
4. Grafana ile sorgu ve dashboard yapilir

Bu stack SIEM degildir. Ama production troubleshooting icin cok guclu bir baseline'dir.

## 2. Local Log Hijyeni

Merkezi loglama kurmadan once host uzerindeki retention kontrol altinda olmali:

```bash
sudo mkdir -p /var/log/journal
sudo systemctl restart systemd-journald
sudo journalctl --disk-usage
```

`/etc/systemd/journald.conf` icin temel ayarlar:

```ini
[Journal]
Storage=persistent
SystemMaxUse=1G
MaxRetentionSec=7day
Compress=yes
```

Uygula:

```bash
sudo systemctl restart systemd-journald
sudo journalctl --disk-usage
```

## 3. Dizin Yapisi

```bash
sudo mkdir -p /opt/logging
sudo mkdir -p /opt/logging/loki
sudo mkdir -p /opt/logging/promtail
cd /opt/logging
```

## 4. Docker Compose ile Loki ve Promtail Kur

`/opt/logging/docker-compose.yml`:

```yaml
services:
  loki:
    image: grafana/loki:2.9.8
    container_name: loki
    restart: unless-stopped
    ports:
      - "127.0.0.1:3100:3100"
    command: -config.file=/etc/loki/config.yml
    volumes:
      - ./loki/config.yml:/etc/loki/config.yml:ro
      - loki-data:/loki

  promtail:
    image: grafana/promtail:2.9.8
    container_name: promtail
    restart: unless-stopped
    command: -config.file=/etc/promtail/config.yml
    volumes:
      - ./promtail/config.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
      - /var/log/journal:/var/log/journal:ro
      - /etc/machine-id:/etc/machine-id:ro
      - /run/log/journal:/run/log/journal:ro

volumes:
  loki-data:
```

`/opt/logging/loki/config.yml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 168h

compactor:
  working_directory: /loki/compactor
  compaction_interval: 10m
  retention_enabled: true
  delete_request_store: filesystem
```

`/opt/logging/promtail/config.yml`:

```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: journal
    journal:
      path: /var/log/journal
      labels:
        job: systemd-journal
        host: server-01
    relabel_configs:
      - source_labels: ['__journal__systemd_unit']
        target_label: unit

  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          host: server-01
          __path__: /var/log/nginx/*.log

  - job_name: app
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          host: server-01
          __path__: /var/log/app/*.log
```

Calistir:

```bash
cd /opt/logging
docker compose up -d
docker compose ps
```

## 5. Grafana Baglantisi

Grafana ayakta ise Loki datasource ekleyin:

- URL: `http://loki:3100` veya ayni hostta `http://127.0.0.1:3100`
- Access: Grafana'nin calisma modeline gore `proxy`

Ilk sorgular:

- `{job="systemd-journal"}`
- `{job="nginx"}`
- `{job="app"}`
- `{job="systemd-journal", unit="ssh.service"}`

## 6. Nginx ve Uygulama Log Standardi

Merkezi loglama kurulu olsa bile local tarafta asgari standardi koruyun:

- Nginx `access.log` ve `error.log` aktif olmali
- Uygulama loglari tek bir dizinde toplanmali: `/var/log/app/*.log`
- Docker loglari sonsuz buyumemeli

Docker icin:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 7. Test Log Gonder

```bash
logger "loki smoke test from $(hostname)"
journalctl -n 5 --no-pager
```

Loki tarafini kontrol et:

```bash
curl -fsS http://127.0.0.1:3100/ready
curl -fsS http://127.0.0.1:9080/ready
curl -G -s http://127.0.0.1:3100/loki/api/v1/label/job/values
```

## 8. Verify Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| Journald persistence | `journalctl --disk-usage` | Loglar disk uzerinde saklaniyor olmali. |
| Loki health | `curl -fsS http://127.0.0.1:3100/ready` | `ready` dönmeli. |
| Promtail health | `curl -fsS http://127.0.0.1:9080/ready` | `ready` dönmeli. |
| Job label'lari | `curl -G -s http://127.0.0.1:3100/loki/api/v1/label/job/values` | `systemd-journal`, `nginx`, `app` gibi label'lar görünmeli. |
| Test logu | `logger "central logging test"` | Log, Grafana veya Loki query ile bulunabilmeli. |

## 9. No-Go Durumlari

Su durumlarda bunu production kabul etmeyin:

- `journald` persistent degilse
- Nginx/app loglari localde bile standardize edilmemisse
- Loki tek hostta calisiyor ama retention tanimi yoksa
- Loglar var ama alarm/operasyon ekibi bu loglari sorgulamayi bilmiyorsa
