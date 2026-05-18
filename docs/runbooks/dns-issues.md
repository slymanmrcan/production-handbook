# DNS Sorunlari

Bu runbook, domain resolve edilemiyorsa uygulanacak triage ve geri getirme akisini standardize eder. Amaç DNS'i "tahmin ederek" degil, resolver, kayıt ve network katmanini ayri ayri dogrulayarak sorunu izole etmektir.

## Etki

- Uygulama upstream'leri hostname ile resolve edemez.
- `apt update`, `curl`, `git`, `docker pull` gibi islemler zaman asimina düşebilir.
- Kullanici tarafinda site acilmaz gibi gorunur ama asil sorun DNS olabilir.

## Tipik Failure Mode'lar

- Yanlis A / AAAA kaydi
- Resolver bozulmasi
- `systemd-resolved` calismiyor
- `/etc/resolv.conf` broken symlink veya elle yazilmis
- UDP/TCP 53 firewall tarafinda engelli
- Split-horizon DNS veya search domain yanlis
- Cloud / provider DNS outage

## 1. Hemen Etkiyi Sinirla

DNS sorununda ilk hedef, uygulamanin cevap vermesini saglamak veya etkiyi azaltmaktir.

- Uygulama kritikse gecici IP bazli konfig kullan.
- Mümkünse saglam bir resolver'a gec.
- DNS bagimli batch / deploy islerini durdur.

Geçici resolver set etmek icin sistemin kullandigi arayuzu bulun:

```bash
ip route | awk '/default/ {print $5; exit}'
```

Sonra:

```bash
resolvectl dns <iface> 1.1.1.1 8.8.8.8
resolvectl flush-caches
```

`resolvectl` yoksa veya `systemd-resolved` kullanilmiyorsa, bu degisiklik provider ve distro standardina gore yapilmalidir.

## 2. Resolver ve Kayıt Kontrolu

Önce lokal çözümleme katmanını kontrol et:

```bash
resolvectl status
cat /etc/resolv.conf
systemctl is-active systemd-resolved
```

Ardindan domain kaydini iki farkli resolver ile test et:

```bash
dig example.com
dig @1.1.1.1 example.com
dig @8.8.8.8 example.com
nslookup example.com 1.1.1.1
getent hosts example.com
```

Beklenen farklar:

- Lokal resolver `SERVFAIL` verip public resolver düzgün yanit veriyorsa sorun local resolver tarafindadir.
- Public resolver'lar da yanlis dönüyorsa kayıt veya propagation problemidir.

## 3. Network Katmani

DNS sorgulari bile bazen network probleminden dolayi calismaz.

```bash
ping -c 3 1.1.1.1
ss -lunp | rg ':(53)\b'
journalctl -u systemd-resolved --since "30 min ago" --no-pager
```

Eger 53 portu gerekiyorsa ve host kendi resolver rolunu oynuyorsa UDP/TCP 53 dinleniyor mu kontrol edin.

## 4. Kayıt Yanlisi veya TTL Problemi

Kayıtlar yeni degistiyse eski IP'ye giden trafik TTL nedeniyle bir süre devam edebilir.

Kontrol:

```bash
dig +trace example.com
dig example.com +short
```

Eger yanlış kayıt görünüyorsa:

- DNS sağlayıcı panelinde kaydı düzelt
- TTL'i geçici olarak düşür
- A / AAAA kaydinin birlikte doğru oldugunu kontrol et

## 5. Hızlı Recovery

### systemd-resolved yeniden baslat

```bash
sudo systemctl restart systemd-resolved
resolvectl flush-caches
resolvectl query example.com
```

### Alternatif DNS kullan

Geçici olarak güvenli bir resolver'a dön:

```bash
sudo resolvectl dns <iface> 1.1.1.1 8.8.8.8
sudo resolvectl flush-caches
```

### Uygulama seviyesinde workaround

DNS beklemeyen kritik servislerde geçici IP veya hosts tabanlı çözüm kullanabilirsiniz:

```bash
echo "203.0.113.10 example.com" | sudo tee -a /etc/hosts
```

Bu geçici bir çözüm olmalı; kalici DNS düzeltmesi yerine geçmez.

## 6. Dogrulama

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Resolver aktif mi | `systemctl is-active systemd-resolved` | `active` olmalı |
| Domain çözülüyor mu | `getent hosts example.com` | Doğru IP görünmeli |
| Public resolver çalışıyor mu | `dig @1.1.1.1 example.com +short` | IP dönmeli |
| Cache temiz mi | `resolvectl flush-caches && resolvectl query example.com` | Güncel kayıt görünmeli |
| Uygulama erişiyor mu | `curl -fsS https://example.com/healthz` | Beklenen cevap dönmeli |

## 7. Escalation Kriterleri

Şu durumda DNS ekibine veya provider'a eskale edin:

- Public resolver'lar da yanlış yanıt veriyorsa
- 5 dakikada çözüm bulunamıyorsa
- Zone transfer / kayıt değişikliği beklenmedik şekilde geri dönüyorsa
- Çoklu region veya multi-domain etkileniyorsa
- DNS sorunundan dolayı ödeme, login veya deploy tamamen durduysa

## 8. Evidence Toplama

```bash
mkdir -p /tmp/incident-evidence
resolvectl status > /tmp/incident-evidence/resolver-status.txt
cat /etc/resolv.conf > /tmp/incident-evidence/resolv.conf.txt
dig example.com > /tmp/incident-evidence/dig-default.txt
dig @1.1.1.1 example.com > /tmp/incident-evidence/dig-1.1.1.1.txt
journalctl -u systemd-resolved --since "1 hour ago" --no-pager > /tmp/incident-evidence/resolved-journal.txt
```
