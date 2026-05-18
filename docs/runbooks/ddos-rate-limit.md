# DDoS / Rate Limit

Bu runbook, L7 trafik patlamasi veya rate-limit ihtiyaci oldugunda uygulanacak ilk savunma katmanini tanimlar. Amaç önce servisi ayakta tutmak, sonra kötü trafik kaynagini sinirlendirmektir.

## Etki

- CPU ve bağlantı sayısı artar.
- Nginx / app 429, 499, 502 veya timeout üretir.
- Legit trafik yavaşlar.
- Load balancer healthcheck fail olabilir.

## Tipik Failure Mode'lar

- Gercek saldırı
- Bot / scraper trafiği
- Hatalı client retry loop
- Bir endpoint'in pahalı hale gelmesi
- Cache devre dışı kalması

## 1. Hemen Etkiyi Sinirla

Öncelik sırası:

1. CDN / WAF / edge rate limit aç
2. En pahalı endpointleri kısıtla
3. Abusive IP'leri blokla
4. Gerekirse geçici bakım sayfasına dön

## 2. Trafik Kaynagini Bul

Nginx access log'dan top source IP'leri çıkar:

```bash
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -n 20
tail -n 100 /var/log/nginx/access.log
journalctl -u nginx --since "10 min ago" --no-pager
```

Bağlantı sayisini gör:

```bash
ss -Htan state established '( sport = :80 or sport = :443 )' | wc -l
ss -Htan state syn-recv '( sport = :80 or sport = :443 )' | wc -l
```

## 3. Hızlı Savunma

### Abusive IP blokla

```bash
sudo ufw deny from 203.0.113.0/24 to any port 80 proto tcp
sudo ufw deny from 203.0.113.0/24 to any port 443 proto tcp
```

### Nginx rate limit devreye al

Eger config hazirsa:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Örnek yaklaşım:

- `/login`, `/api/auth`, `/search` gibi pahalı endpointlere limit uygula
- statik dosyalar için cache açık tut
- agresif botlara 429 dön

### Cahilce değil, kontrollü kısıtla

Sadece SSH'ye `ufw limit ssh` uygulamak bu sorunu çözmez; bu, yalnızca SSH brute-force için kullanılır. DDoS / rate-limit için asıl karar uygulama katmanında veya edge'de verilmelidir.

## 4. Host Sagligini Kontrol Et

```bash
uptime
top -b -n1 | head -n 20
free -h
ss -s
```

CPU veya connection backlog host seviyesinde eriyor mu kontrol edin.

## 5. Dogrulama

| Kontrol | Komut / İşlem | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| Legit trafik çalışıyor mu | `curl -fsS https://<app>/healthz` | 200 dönmeli |
| Abusive IP bloklu mu | `sudo ufw status numbered` | Beklenen deny kuralı görünmeli |
| Nginx rate limit aktif mi | `nginx -T | rg -n 'limit_req|limit_conn'` | Limit kuralları görünmeli |
| Bağlantı sayısı normale döndü mü | `ss -Htan state established '( sport = :80 or sport = :443 )' | wc -l` | Sayı düşmeli |
| Uygulama hala ayakta mı | `systemctl status nginx` | `active` olmalı |

## 6. Escalation Kriterleri

- Trafik edge / WAF olmadan sürdürülemiyorsa
- Legit kullanıcılar da ciddi etkileniyorsa
- Attack CPU, bandwidth veya connection limitlerini aşıyorsa
- Aynı anda başka bir incident'i tetikliyorsa

Bu durumda provider, CDN veya upstream WAF ekibi ile birlikte çalışın.

## 7. Evidence Toplama

```bash
mkdir -p /tmp/incident-evidence
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -n 20 > /tmp/incident-evidence/top-ips.txt
tail -n 100 /var/log/nginx/access.log > /tmp/incident-evidence/nginx-access-tail.txt
journalctl -u nginx --since "30 min ago" --no-pager > /tmp/incident-evidence/nginx-journal.txt
ss -s > /tmp/incident-evidence/ss-summary.txt
```
