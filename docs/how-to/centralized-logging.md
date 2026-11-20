# Merkezi Loglama (Loki + Grafana Alloy)

Grafana Alloy, journal ve seçili dosya loglarını Loki'ye gönderir. Operatör Grafana üzerinden SSH, Nginx ve uygulama olaylarını host adı ve zaman aralığıyla sorgular. Güvenlik incelemesinde kayıtları kaynak sunucudan ayrı, erişimi sınırlı bir hedefte saklayın.

## 1. Journal Saklama

`/etc/systemd/journald.conf.d/60-retention.conf` dosyasına yazın. Dizin yoksa önce oluşturun.

```ini
[Journal]
Storage=persistent
SystemMaxUse=1G
MaxRetentionSec=7day
Compress=yes
```

```bash
sudo systemctl restart systemd-journald
sudo journalctl --flush
sudo journalctl --disk-usage
sudo journalctl --list-boots
```

Yerel saklamayı disk kapasitesine göre ayarlayın. Merkezi hedefte ayrı bir retention belirleyin. Olay kapsamındaki logları genel retention süresinden bağımsız koruyun.

## 2. Loki

Bu tek düğümlü örnekte Loki `/opt/logging` altında çalışır. HTTP portu yalnızca host üzerinden loopback'e yayınlanır. Aynı Docker ağına katılan servisler de Loki'ye erişebilir. Ağa yalnızca güvendiğiniz servisleri bağlayın. [Loki kimlik doğrulama belgeleri](https://grafana.com/docs/loki/latest/operations/authentication/)

`/opt/logging/docker-compose.yml`:

```yaml
services:
  loki:
    image: grafana/loki:3.7.8
    user: "10001:10001"
    restart: unless-stopped
    ports:
      - "127.0.0.1:3100:3100"
    command: ["-config.file=/etc/loki/config.yml"]
    volumes:
      - ./loki/config.yml:/etc/loki/config.yml:ro
      - loki-data:/loki
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cpus: 1.0
    mem_limit: 1g
    pids_limit: 128
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "/usr/bin/loki", "-health", "-health.url=http://127.0.0.1:3100/ready"]
      start_period: 60s
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  loki-data:
```

`/opt/logging/loki/config.yml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_address: 127.0.0.1

common:
  instance_addr: 127.0.0.1
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
    - from: "2024-01-01"
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
  retention_enabled: true
  delete_request_store: filesystem
```

```bash
cd /opt/logging
docker compose config --quiet
docker compose run --rm --no-deps loki -config.file=/etc/loki/config.yml -verify-config=true
docker compose up -d loki
docker compose ps loki
curl -fsS http://127.0.0.1:3100/ready
```

Mevcut Loki kurulumunu yükseltiyorsanız önce yapılandırma ve volume yedeğini alın. Tarihsel `schema_config` girişlerini ve mevcut volume eşlemesini koruyun. Mevcut sürümden yükseltme adımlarını test ortamında uygulayıp geçmiş logları sorgulayın. [Loki yükseltme belgeleri](https://grafana.com/docs/loki/latest/setup/upgrade/)

## 3. Grafana Alloy

[Grafana'nın imzalı APT deposu üzerinden Alloy'u](https://grafana.com/docs/alloy/latest/set-up/install/linux/) kaynak host'a systemd servisi olarak kurun. `id alloy` ile servis hesabının journal okuma gruplarını doğrulayın. Paket bu grupları eklememişse `sudo usermod -aG adm,systemd-journal alloy` ile ekleyin. Nginx ve uygulama logları için yalnızca ilgili dosya ve dizinlere okuma erişimi verin. [Alloy izin belgeleri](https://grafana.com/docs/grafana-cloud/send-data/alloy/access_permissions/linux/)

`/etc/alloy/config.alloy` dosyasına aşağıdaki bileşenleri ekleyin. Örnek URL, Loki'nin aynı makinede olduğu kurulum içindir. Sunucu dışına log göndermek için hedefte yetkilendirme yapan HTTPS reverse proxy veya özel ağ üzerinden korumalı bir log ucu kullanın. Gerekli token'ı dosyadan okutun. [Alloy hedef ve kimlik doğrulama ayarları](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/)

```alloy
loki.relabel "journal" {
  forward_to = []

  rule {
    source_labels = ["__journal__systemd_unit"]
    target_label  = "unit"
  }
}

loki.source.journal "host" {
  labels        = { job = "systemd-journal", host = constants.hostname }
  max_age       = "24h"
  relabel_rules = loki.relabel.journal.rules
  forward_to    = [loki.write.logs.receiver]
}

loki.source.file "web" {
  targets = [
    { __path__ = "/var/log/nginx/*.log", job = "nginx", host = constants.hostname },
    { __path__ = "/var/log/app/*.log", job = "app", host = constants.hostname },
  ]
  forward_to = [loki.write.logs.receiver]

  file_match {
    enabled = true
  }
}

loki.write "logs" {
  endpoint {
    url = "http://127.0.0.1:3100/loki/api/v1/push"
  }
}
```

Uygulamanız systemd üzerinden journal'a yazıyorsa `loki.source.journal` bu kayıtları zaten toplar. Aynı kayıtları ayrıca dosyadan göndermeyin. Dosya logları yoksa veya kullanılmıyorsa ilgili `targets` satırını çıkarın.

```bash
sudo -u alloy alloy validate /etc/alloy/config.alloy
sudo systemctl enable alloy
sudo systemctl restart alloy
sudo journalctl -u alloy -n 50 --no-pager
curl -fsS http://127.0.0.1:12345/-/ready
```

### Promtail'den geçiş

Promtail 2 Mart 2026'da kullanım ömrünü tamamladı. Mevcut config ve position dosyalarını saklayın. [Grafana'nın geçiş rehberi](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/) ile mevcut config'i dönüştürün. Geçiş saatini kaydedin, aynı kaynağı iki toplayıcının eş zamanlı göndermesini önleyin ve kesim öncesi/sonrası logların geldiğini doğrulayın. Eski loki volume'ünü koruyun.

## 4. Grafana ve Doğrulama

Grafana host üzerinde çalışıyorsa Loki datasource URL'si `http://127.0.0.1:3100` olabilir. Grafana bir container ise Loki ile güvenilir bir Docker ağını paylaşmalı veya yetkili HTTPS log hedefine erişmelidir. Aynı ağdaysa `http://loki:3100` kullanılabilir.

```bash
logger -t handbook-log-test "loki smoke test from $(hostname)"
journalctl -t handbook-log-test -n 5 --no-pager
curl -fsS http://127.0.0.1:3100/ready
curl -fsS http://127.0.0.1:12345/-/ready
sudo ss -lntp '( sport = :3100 or sport = :12345 )'
```

Grafana Explore'da `{job="systemd-journal"} |= "loki smoke test"` sorgusuyla test kaydının doğru host'tan ulaştığını doğrulayın. Ardından `{job="systemd-journal", unit="ssh.service"}` ve varsa `{job="nginx"}` ile gerçek kaynakları doğrulayın. Test kaydı görünmüyorsa Alloy journal'ında izin hatalarına ve Loki gönderim hatalarına bakın.

Loki'nin yalnızca beklenen loopback adresinden yayınlandığını Docker port listesinde de doğrulayın. Üretim için hedefin kaynak host'tan bağımsızlığını, saklama süresini ve erişim yetkilerini ayrıca kontrol edin.
