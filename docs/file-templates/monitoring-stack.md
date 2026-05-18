# Monitoring Stack (Production Ready) 📊

Modern production ortamlarında **Prometheus + Grafana + Exporters** kombinasyonu endüstri standardıdır. Bu template ile tam bir monitoring altyapısı kurabilirsiniz.

## Hardening Kararları

Bu stack doğası gereği host ve container metriklerine dokunur; yani normal bir web uygulamasından daha yüksek güven ilişkisi ister.

- Bütün UI portlarını localhost'a bind edin, dış erişimi reverse proxy + auth ile açın.
- Kör `latest` tag kullanmayın; ilk kurulumdan önce sürüm pinleyin.
- Grafana admin parolasını düz environment satırında bırakmayın; secret file veya opsiyonel env dosyasına taşıyın.
- cAdvisor host düzeyi erişim ister; container metrikleri gerekmiyorsa tamamen kaldırın.
- Exporter'lar için ayrı public port açmayın; Prometheus'un aynı network içinden scrape etmesi yeterlidir.

---

## 🏗️ Klasör Yapısı

```text
monitoring/
├── docker-compose.yml
├── prometheus/
│   ├── prometheus.yml
│   ├── alerts.yml
│   └── data/
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml
│   │   └── dashboards/
│   │       ├── dashboard.yml
│   │       └── node-exporter.json
│   └── data/
├── alertmanager/
│   ├── config.yml
│   └── data/
└── loki/
    ├── config.yml
    └── data/
```

---

## 🐳 Docker Compose Dosyası

```yaml
version: "3.8"

services:
  # Prometheus - Metrics toplama
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: always
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--storage.tsdb.retention.time=30d"
      - "--web.console.libraries=/etc/prometheus/console_libraries"
      - "--web.console.templates=/etc/prometheus/consoles"
      - "--web.enable-lifecycle"
    ports:
      - "127.0.0.1:9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
      - ./prometheus/data:/prometheus
    networks:
      - monitoring
    mem_limit: 1g
    cpus: 1.0

  # Grafana - Görselleştirme
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: always
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123 # ÖNEMLİ: Değiştirin!
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://monitoring.example.com
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - ./grafana/data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    networks:
      - monitoring
    depends_on:
      - prometheus
    mem_limit: 512m

  # Node Exporter - Sistem metrikleri
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: always
    command:
      - "--path.procfs=/host/proc"
      - "--path.sysfs=/host/sys"
      - "--path.rootfs=/rootfs"
      - "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)"
    ports:
      - "127.0.0.1:9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    networks:
      - monitoring
    pid: host

  # cAdvisor - Container metrikleri
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: always
    ports:
      - "127.0.0.1:8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    networks:
      - monitoring
    privileged: true
    devices:
      - /dev/kmsg

  # Alertmanager - Alarm yönetimi
  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: always
    command:
      - "--config.file=/etc/alertmanager/config.yml"
      - "--storage.path=/alertmanager"
    ports:
      - "127.0.0.1:9093:9093"
    volumes:
      - ./alertmanager/config.yml:/etc/alertmanager/config.yml:ro
      - ./alertmanager/data:/alertmanager
    networks:
      - monitoring

  # Loki - Log toplama (opsiyonel)
  loki:
    image: grafana/loki:latest
    container_name: loki
    restart: always
    ports:
      - "127.0.0.1:3100:3100"
    volumes:
      - ./loki/config.yml:/etc/loki/local-config.yaml:ro
      - ./loki/data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - monitoring

  # Promtail - Log shipper (opsiyonel)
  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    restart: always
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./loki/promtail-config.yml:/etc/promtail/config.yml:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

---

## ⚙️ Prometheus Konfigürasyonu

`prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: "production"
    region: "eu-west-1"

# Alertmanager bağlantısı
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Alert kuralları
rule_files:
  - "alerts.yml"

# Scrape hedefleri
scrape_configs:
  # Prometheus kendisi
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  # Node Exporter (Sistem metrikleri)
  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]
        labels:
          instance: "production-server"

  # cAdvisor (Container metrikleri)
  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]

  # Docker container'ları otomatik keşfet
  - job_name: "docker-containers"
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        target_label: container

  # Postgres Exporter (eğer kuruluysa)
  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]

  # Redis Exporter (eğer kuruluysa)
  - job_name: "redis"
    static_configs:
      - targets: ["redis-exporter:9121"]

  # Nginx Exporter (eğer kuruluysa)
  - job_name: "nginx"
    static_configs:
      - targets: ["nginx-exporter:9113"]

  # Blackbox Exporter (HTTP/HTTPS health check)
  - job_name: "blackbox"
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://example.com
          - https://api.example.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

---

## 🚨 Alert Kuralları

`prometheus/alerts.yml`:

```yaml
groups:
  - name: system_alerts
    interval: 30s
    rules:
      # Yüksek CPU kullanımı
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 80% (current: {{ $value }}%)"

      # Yüksek Memory kullanımı
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 85% (current: {{ $value }}%)"

      # Disk doluluk
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Disk space is below 15% (current: {{ $value }}%)"

      # Servis down
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} has been down for more than 2 minutes"

      # Container restart
      - alert: ContainerRestarting
        expr: rate(container_last_seen{name!=""}[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Container {{ $labels.name }} is restarting"
          description: "Container has restarted {{ $value }} times in the last 5 minutes"

  - name: application_alerts
    interval: 30s
    rules:
      # HTTP 5xx hatalar
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          description: "Error rate is {{ $value }} req/s"

      # Yavaş response time
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time on {{ $labels.instance }}"
          description: "95th percentile is {{ $value }}s"
```

---

## 📧 Alertmanager Konfigürasyonu

`alertmanager/config.yml`:

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: "smtp.gmail.com:587"
  smtp_from: "alerts@example.com"
  smtp_auth_username: "alerts@example.com"
  smtp_auth_password: "your-app-password"

# Alarm yönlendirme
route:
  group_by: ["alertname", "cluster", "service"]
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: "default"
  routes:
    # Critical alarmlar hemen gönder
    - match:
        severity: critical
      receiver: "critical-alerts"
      continue: true

    # Warning alarmlar 5 dakika bekle
    - match:
        severity: warning
      receiver: "warning-alerts"
      group_wait: 5m

# Alıcılar
receivers:
  - name: "default"
    email_configs:
      - to: "team@example.com"
        headers:
          Subject: "[MONITORING] {{ .GroupLabels.alertname }}"

  - name: "critical-alerts"
    email_configs:
      - to: "oncall@example.com"
        headers:
          Subject: "🚨 [CRITICAL] {{ .GroupLabels.alertname }}"
    # Slack entegrasyonu
    slack_configs:
      - api_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        channel: "#alerts"
        title: "🚨 Critical Alert"
        text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"

  - name: "warning-alerts"
    email_configs:
      - to: "team@example.com"
        headers:
          Subject: "⚠️ [WARNING] {{ .GroupLabels.alertname }}"

# Alarm susturma
inhibit_rules:
  - source_match:
      severity: "critical"
    target_match:
      severity: "warning"
    equal: ["alertname", "instance"]
```

---

## 📊 Grafana Datasource Provisioning

`grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
```

---

## 🚀 Başlatma

```bash
# Klasörleri oluştur
mkdir -p prometheus/data grafana/data alertmanager/data loki/data

# İzinleri ayarla
sudo chown -R 65534:65534 prometheus/data
sudo chown -R 472:472 grafana/data

# Stack'i başlat
docker compose up -d

# Logları kontrol et
docker compose logs -f
```

> [!WARNING]
> İlk boot'tan önce en az şu üç şeyi değiştirin: image tag pinleme, Grafana admin parolası, Alertmanager SMTP secret yönetimi.

---

## 🔗 Erişim URL'leri

| Servis            | URL                           | Varsayılan Giriş |
| :---------------- | :---------------------------- | :--------------- |
| **Grafana**       | http://localhost:3000         | admin / admin123 |
| **Prometheus**    | http://localhost:9090         | -                |
| **Alertmanager**  | http://localhost:9093         | -                |
| **Node Exporter** | http://localhost:9100/metrics | -                |
| **cAdvisor**      | http://localhost:8080         | -                |

---

## Deployment Verification

```bash
docker compose ps
ss -ltnp | rg ':(3000|8080|9090|9093|9100|3100) '
curl -fsS http://127.0.0.1:9090/-/ready
curl -fsS http://127.0.0.1:9093/-/ready
curl -fsS http://127.0.0.1:3000/api/health
docker compose logs --tail=100 prometheus grafana alertmanager
```

Beklenen sonuç:

- `docker compose ps` içinde ana servisler `Up` görünmeli.
- Açık portlar sadece beklenen localhost bind'leri olmalı.
- Prometheus ve Alertmanager readiness endpoint'leri `200` dönmeli.
- Grafana health endpoint'i başarılı dönmeli.
- Loglarda permission denied, bind error veya config parse hatası olmamalı.

---

## 📈 Önerilen Grafana Dashboard'ları

```bash
# Grafana'ya giriş yaptıktan sonra:
# 1. Dashboards → Import
# 2. Aşağıdaki ID'leri kullan:

# Node Exporter Full
1860

# Docker Container & Host Metrics
10619

# Prometheus 2.0 Stats
3662

# Loki Dashboard
13639
```

---

## 🔧 Ek Exporter'lar

### Postgres Exporter

```yaml
postgres-exporter:
  image: prometheuscommunity/postgres-exporter
  container_name: postgres-exporter
  restart: always
  environment:
    DATA_SOURCE_NAME: "postgresql://user:password@postgres:5432/dbname?sslmode=disable"
  ports:
    - "127.0.0.1:9187:9187"
  networks:
    - monitoring
```

### Redis Exporter

```yaml
redis-exporter:
  image: oliver006/redis_exporter
  container_name: redis-exporter
  restart: always
  environment:
    REDIS_ADDR: "redis:6379"
    REDIS_PASSWORD: "your-redis-password"
  ports:
    - "127.0.0.1:9121:9121"
  networks:
    - monitoring
```

### Nginx Exporter

```yaml
nginx-exporter:
  image: nginx/nginx-prometheus-exporter
  container_name: nginx-exporter
  restart: always
  command:
    - "-nginx.scrape-uri=http://nginx:8080/stub_status"
  ports:
    - "127.0.0.1:9113:9113"
  networks:
    - monitoring
```

---

## 🛡️ Güvenlik Önerileri

> [!WARNING]
> **Production Ortamı İçin**
>
> 1. **Grafana şifresini değiştirin** ve düz env yerine secret dosyasına taşıyın.
> 2. **Image tag'lerini pinleyin**; `latest` ile kontrolsüz upgrade almayın.
> 3. **Port'ları localhost'a bağlayın** ve dış erişimi reverse proxy ile yönetin.
> 4. **Alertmanager SMTP secret'larını** `.env` veya secret file ile yönetin.
> 5. **Retention süresini** disk kapasitenize göre ayarlayın.
> 6. **cAdvisor** gerekmiyorsa devre dışı bırakın; host erişim yüzeyi gereksiz büyümesin.

---

## 📚 Referanslar

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node Exporter](https://github.com/prometheus/node_exporter)
- [Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)
