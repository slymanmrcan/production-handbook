# Load Balancer Healthcheck Fail

Bu runbook, load balancer target'larinin unhealthy görünmesi durumunda uygulanacak triage akisini standardize eder. Sorun bazen target'ta, bazen health endpoint'te, bazen de LB ile app arasindaki ağ katmanindadir.

## Etki

- Target group unhealthy olur.
- Trafik sağlıklı node'lara gitmez.
- Deploy sonrası rollout takılabilir.
- Canary / blue-green geçişi durabilir.

## Tipik Failure Mode'lar

- Healthcheck path yanlış
- Health endpoint 200 dışında cevap dönüyor
- Nginx / app bind address yanlış
- Firewall / security group healthcheck portunu kapatıyor
- TLS mismatch veya host header sorunu
- Timeout çok düşük
- Uygulama başlangıç süresi sağlık kontrolünden uzun

## 1. Hemen Etkiyi Sinirla

- Sağlıklı target'lar varsa trafiği onlara yönlendir.
- Bozuk node'u geçici olarak rotasyondan çıkar.
- Deploy devam ediyorsa durdur.

Eğer LB üzerinde manuel target management varsa, önce target'ın gerçekten problemli olduğunu doğrula.

## 2. Yerel Endpoint'i Test Et

Healthcheck endpoint ne dönüyor?

```bash
curl -I http://127.0.0.1/healthz
curl -fsS http://127.0.0.1/healthz
curl -o /dev/null -s -w 'code=%{http_code} total=%{time_total}\n' http://127.0.0.1/healthz
```

Host header gerekiyorsa:

```bash
curl -I -H 'Host: example.com' http://127.0.0.1/healthz
```

## 3. Uygulama ve Proxy Katmanini Kontrol Et

```bash
ss -ltnp
nginx -t
systemctl status nginx --no-pager
journalctl -u nginx --since "30 min ago" --no-pager
tail -n 100 /var/log/nginx/error.log
```

Aranacak şeyler:

- upstream connect refused
- 502 / 504
- yanlış port
- header / host mismatch
- timeout

## 4. Load Balancer'a Uygunluk

LB healthcheck path'i ve uygulama path'i ayni degilse health endpoint ayri, kullanıcı path'i ayri olabilir.

Kontrol:

- Healthcheck path 200 dönüyor mu?
- Timeout gerçek startup süresinden uzun mu?
- TLS healthcheck yaparken sertifika hostname ile uyumlu mu?

Eger provider konsolu gerekiyorsa target health oradan teyit edilir.

## 5. Hızlı Recovery

### Nginx reload

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Uygulamayi yeniden baslat

```bash
sudo systemctl restart app
docker restart app 2>/dev/null || true
```

### Healthcheck ayarini geçici gevşet

Yalnizca uygulama gerçekten hazır olmadan LB healthcheck vuruyorsa timeout artırın veya initial delay ekleyin. Kalıcı çözüm olarak endpoint'i hızlandırın.

## 6. Dogrulama

| Kontrol | Komut / İşlem | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| Health endpoint | `curl -fsS http://127.0.0.1/healthz` | 200 dönmeli |
| Nginx config | `nginx -t` | Syntax OK olmalı |
| Nginx status | `systemctl is-active nginx` | `active` olmalı |
| Upstream dinliyor mu | `ss -ltnp` | Beklenen app portu dinlemeli |
| LB tarafı | Console / target health | Target healthy görünmeli |

## 7. Escalation Kriterleri

- Endpoint lokalda da başarısızsa
- Target health 10 dakikada düzelmiyorsa
- Healthcheck path ile app path çelişiyorsa ve hızlı fix yoksa
- TLS / certificate problemi yüzünden target sağlıklı olamıyorsa

## 8. Evidence Toplama

```bash
mkdir -p /tmp/incident-evidence
curl -I http://127.0.0.1/healthz > /tmp/incident-evidence/healthz-header.txt
nginx -t > /tmp/incident-evidence/nginx-test.txt 2>&1
systemctl status nginx --no-pager > /tmp/incident-evidence/nginx-status.txt 2>&1
journalctl -u nginx --since "1 hour ago" --no-pager > /tmp/incident-evidence/nginx-journal.txt
```
