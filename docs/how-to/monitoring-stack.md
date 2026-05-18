# Monitoring Stack: Prometheus + Grafana + Alertmanager

Bu rehber, küçük ve orta ölçekli Linux server kurulumları için production-usable bir izleme baseline kurar. Amaç sadece dashboard açmak değil, metrik, alarm ve operasyon akışını tek yerde toplamaktır.

## 1. Mimari

Önerilen minimum bileşenler:

- `Prometheus`: metrik toplama ve sorgulama
- `Grafana`: dashboard ve operatör görünümü
- `Alertmanager`: alarm yönlendirme ve susturma
- `node_exporter`: host metrikleri

Basit akış:

1. `node_exporter` host metriklerini verir.
2. Prometheus bu hedefleri scrape eder.
3. Alert kuralları Prometheus'ta değerlendirilir.
4. Alarm üretilince Alertmanager bildirim kanalına yollar.
5. Grafana hem Prometheus hem Alertmanager verisini operatöre gösterir.

Bu setup tek sunucuda da çalışır. Daha sonra node_exporter'i diğer host'lara yayabilirsiniz.

## 2. Dizin Yapısı

Bir Docker Compose tabanı için temiz dizin yapısı kullanın:

```bash
sudo mkdir -p /opt/monitoring/{prometheus,alertmanager,grafana/provisioning/datasources,grafana/provisioning/dashboards}
cd /opt/monitoring
```

## 3. Docker Compose Örneği

`/opt/monitoring/docker-compose.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.54.1
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "127.0.0.1:9090:9090"
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --web.enable-lifecycle
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/rules.yml:/etc/prometheus/rules.yml:ro
      - prometheus-data:/prometheus

  alertmanager:
    image: prom/alertmanager:v0.28.0
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "127.0.0.1:9093:9093"
    command:
      - --config.file=/etc/alertmanager/alertmanager.yml
      - --storage.path=/alertmanager
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager-data:/alertmanager

  grafana:
    image: grafana/grafana:11.1.0
    container_name: grafana
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: change-this-password
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro

  node-exporter:
    image: prom/node-exporter:v1.8.2
    container_name: node-exporter
    restart: unless-stopped
    command:
      - --path.rootfs=/host
      - --web.listen-address=:9100
    volumes:
      - /:/host:ro,rslave
    ports:
      - "127.0.0.1:9100:9100"

volumes:
  prometheus-data:
  alertmanager-data:
  grafana-data:
```

`node-exporter` aynı Docker ağına bağlıdır ve 9100 portunu local host'a açar.

## 4. Prometheus Konfigürasyonu

`/opt/monitoring/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/rules.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["prometheus:9090"]

  - job_name: node
    static_configs:
      - targets: ["node-exporter:9100"]
```

Notlar:

- `node-exporter` target'ı aynı Docker ağı üzerinden erişilir.
- Uygulama metrikleri için sonra ikinci bir `scrape_config` ekleyin; bu baseline host metrikleri için yeterlidir.

## 5. Alert Kuralları

`/opt/monitoring/prometheus/rules.yml`:

```yaml
groups:
  - name: host-alerts
    rules:
      - alert: HostDown
        expr: up{job="node"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Host down"
          description: "Node exporter target is unreachable."

      - alert: HighCpuUsage
        expr: avg by (instance) (rate(node_cpu_seconds_total{mode!="idle"}[5m])) > 0.80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is above 80 percent for 10 minutes."

      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) < 0.15
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Filesystem free space is below 15 percent."

      - alert: MemoryPressure
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Memory pressure"
          description: "Memory usage is above 90 percent."
```

Bu kurallar basit ama işe yarar. Üretimde ilk alarm seti buna benzer olmalıdır: host down, CPU, disk, memory.

## 6. Alertmanager Konfigürasyonu

`/opt/monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  receiver: default
  group_by: ["alertname", "instance"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: default
    # Slack/Email/Webhook entegrasyonunu buraya ekleyin.
    # Alertmanager ilk etapta en azından bu receiver ile ayağa kalkmalı.
```

İlk kurulumda bildirim kanalı boş kalabilir, ama route ve receiver yapısı hazır olmalıdır. Sonra Slack, email veya webhook eklenir.

## 7. Grafana Provisioning

`/opt/monitoring/grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

Alertmanager datasource veya plugin kullanıyorsanız sonradan ekleyin.

## 8. Kurulum ve Başlatma

```bash
cd /opt/monitoring
docker compose up -d
docker compose ps
```

Node exporter host target olarak görünmüyorsa Prometheus'u kontrol edin:

```bash
docker logs prometheus --tail 50
```

## 9. İlk Dashboard ve Görüşler

Grafana'da ilk bakılacak dashboard'lar:

- host CPU, memory, disk
- filesystem usage
- load average
- Prometheus target health

İlk üç soru şunlar olmalı:

1. Host up mı?
2. Disk doluyor mu?
3. CPU ve memory neden yükselmiş?

## 10. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Prometheus hazır mı | `curl -fsS http://127.0.0.1:9090/-/ready` | `Ready` dönmeli |
| Alertmanager hazır mı | `curl -fsS http://127.0.0.1:9093/-/ready` | `Ready` dönmeli |
| Grafana hazır mı | `curl -fsS http://127.0.0.1:3001/api/health` | `{"database":"ok"...}` benzeri çıktı dönmeli |
| Node exporter açık mı | `curl -fsS http://127.0.0.1:9100/metrics | head` | Metrik çıktısı görünmeli |
| Target'lar scrape ediliyor mu | `curl -fsS http://127.0.0.1:9090/api/v1/targets` | `node`, `prometheus` ve `app` hedefleri görünmeli |
| Alarm kuralı yüklendi mi | `curl -fsS http://127.0.0.1:9090/api/v1/rules` | `host-alerts` grubu görünmeli |

## 11. Sık Sorulan Operasyon Kararları

- Tek sunucu için bu stack yeterli midir? Evet, başlangıç için yeterlidir.
- Remote host'lar nasıl eklenir? `scrape_configs` içine yeni target'lar eklenir.
- Node exporter şart mı? Host health için evet, en azından bir host exporter gerekir.
- Grafana admin password'ü ne olacak? İlk login sonrası değiştirin ve secrets yönetimine taşıyın.
