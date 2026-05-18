# Monitoring Kurulumu

Bu rehber, Ubuntu/Debian tabanli bir sunucuda minimum ama production-usable monitoring baseline kurmak icin yazildi. Ama hedef "dashboard acmak" degil; servis, host ve kullanici etkisini erken yakalamak.

## Kapsam

Bu sayfa su katmanlari kapsar:

- host sagligi: CPU, memory, disk, load, network
- servis sagligi: systemd unit, HTTP healthcheck, port dinleme
- alarm politikasi: ne zaman page edilir, ne zaman sadece warn olur
- log gorunurlugu: journal, uygulama logu, reverse proxy logu

Detayli stack kurulum icin: [Monitoring Stack](monitoring-stack.md)

## Ne Zaman Kullanilir

- yeni server teslim alindiginda
- yeni servis yayina alinmadan once
- incident sonrasi eksik gozlem noktasi kapatirken
- uptime, latency veya error rate konularinda kararlilik ararken

## Monitoring Politikasi

- "Bildir" ile "page et" ayri seylerdir; her anomali alarm degildir.
- Her kritik servis icin en az bir `availability`, bir `latency`, bir `error rate` sinyali tanimlanmali.
- Host monitoring ile app monitoring karismamali; ikisi ayri dashboard ve ayri alarm gruplari olmalidir.
- Loglar, metric yerine gecmez; metric, log ve healthcheck birlikte kullanilmalidir.

## Minimum Baseline

Her production host icin asgari olarak su sinyallerin gorunur olmasi gerekir:

- `systemd` unit state
- `journalctl -u <service>` cikisi
- HTTP health endpoint
- disk usage
- memory pressure
- network reachability

Host exporter kullanacaksaniz Ubuntu/Debian icin en pratik yol:

```bash
sudo apt update
sudo apt install -y prometheus-node-exporter
sudo systemctl enable --now prometheus-node-exporter
curl -fsS http://127.0.0.1:9100/metrics | head
```

## Pratik Kurulum Akisi

1. Izlenecek servisleri ve endpointleri listele.
2. Her servis icin bir healthcheck tanimla.
3. Host metriklerini node exporter ile ac.
4. Dashboard ve alarm icin ortak isimlendirme standardi kullan.
5. Alarm threshold'larini gercek trafik uzerinden belirle.
6. Incident sonrasi alarm gürültüsünü azalt.

## Ornek Prometheus Scrape

Eger Prometheus kullaniyorsaniz, en azindan su iki hedefi gorecek sekilde basin:

```yaml
scrape_configs:
  - job_name: node
    static_configs:
      - targets:
          - "127.0.0.1:9100"

  - job_name: app-health
    metrics_path: /health
    static_configs:
      - targets:
          - "127.0.0.1:3000"
```

Bu sadece iskelet. Gercek ortamda app tarafini HTTP health, exporter ve gerekiyorsa blackbox probe ile ayir.

## Alarm Eslikleri

Baseline icin tipik ilk kurallar:

- `HostDown`: host veya exporter erisilemiyor
- `HighCpuUsage`: 10 dakika ust uste yuksek CPU
- `MemoryPressure`: memory available dusuk
- `LowDiskSpace`: filesystem bos alan kritik
- `ServiceDown`: health endpoint cevap vermiyor
- `HighLatency`: p95/p99 threshold asti
- `HighErrorRate`: 5xx veya islem hatasi artti

Yalin ve faydali threshold'lar kullan. Bir haftalik grafige bakmadan threshold belirleme.

## Log ve Healthcheck Sinyalleri

Monitoring, loglara dokunmadan eksik kalir.

```bash
systemctl status nginx --no-pager -l
journalctl -u nginx -b -n 100 --no-pager
curl -fsS http://127.0.0.1/healthz
df -h /
free -h
ss -lntup
```

Eger servis container icindeyse ayni kontrolleri container ve host seviyesinde ayri ayri yap.

## Uptime / External Check

Disari acik servisler icin en az bir dis probe kullan:

- Uptime Kuma
- Pingdom
- Better Stack
- PagerDuty heartbeat veya webhook tabanli checker

Dis probe ile ic host metriğini karistirma. Disari aciklik ile ic saglik ayni sey degildir.

## Verify Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| Node exporter aktif mi | `systemctl is-active prometheus-node-exporter` | `active` olmali |
| Exporter metrics geliyor mu | `curl -fsS http://127.0.0.1:9100/metrics` | Metrics text donmeli |
| Servis saglik endpoint'i calisiyor mu | `curl -fsS http://127.0.0.1/healthz` | `200` veya beklenen body donmeli |
| Journal erisilebilir mi | `journalctl -u <service> -n 50 --no-pager` | Son run gorunmeli |
| Disk ve memory gorunuyor mu | `df -h /` ve `free -h` | Degerler okunabilir olmali |
| Alarm yolu calisiyor mu | Test alert tetikle | Bildirim gercek kanalina gitmeli |

## Common Mistakes

- Sadece dashboard bakip alarm kurgulamamak
- `UP` metriğine bakip latency ve error rate'i yok saymak
- Host ve app alarm'larini tek alarm grubunda birlestirmek
- Logu monitoring ile degistirmek
- `curl -k` ile sertifika problemini gizlemek
- Threshold'lari veri olmadan belirlemek
