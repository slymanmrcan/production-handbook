# AI ile Altyapı & Ops Çalışma Rehberi 🛠️

AI'ı yalnızca uygulama kodu yazarken değil; sunucu konfigürasyonu hazırlarken, log analizi yaparken ve arıza teşhis ederken (troubleshooting) doğru kullanmak hız kazandırır. Yanlış kullanmak ise zaman kaybı ve güvenlik açığı üretir.

---

## 1. AI'a Bilgi Verirken (Redaction & Sinyal Kuralları)

### Asla Paylaşılmayacaklar
- Private SSH key'ler, TLS private key'ler (`.key`, `.pem`)
- Gerçek veritabanı şifreleri, API token'ları, `.env` değerleri
- Kişisel müşteri verisi (PII) içeren ham veritabanı dump'ları veya request payload'ları

### Paylaşılması Gereken Yüksek Sinyalli Çıktılar
"Sunucu çalışmıyor" veya "Nginx hata veriyor" demek yerine aşağıdaki yapılandırılmış çıktıları (hassas alanları maskeleyerek) verin:

| Problem Türü | AI'a Verilecek Komut Çıktısı |
| :--- | :--- |
| **Port / Bağlantı Hatası** | `ss -lntup`, `ufw status verbose`, ilgili Nginx server block |
| **Container Çöküyor / Healthy Değil** | `docker ps -a`, `docker logs <container> --tail 100`, `docker inspect <container> --format '{{json .State}}'` |
| **Sistem Yavaş / OOM / Disk** | `uptime`, `free -h`, `df -h`, `df -i`, `dmesg -T \| grep -i oom \| tail -n 20` |
| **Servis Başlamıyor** | `systemctl status <service> --no-pager`, `journalctl -u <service> -n 50 --no-pager` |
| **TLS / Reverse Proxy** | `nginx -t`, `curl -Iv https://<domain>/healthz`, `certbot certificates` |

---

## 2. Etkili Çalışma Desenleri

### Desen A — Konfigürasyon Üretme
AI'dan config isterken 4 şeyi birlikte isteyin:
1. Hedef ortam (Ubuntu 24.04, Nginx, Docker Compose v2)
2. Kısıtlar ([infra-context.md](infra-context.md) kuralları: non-root, `127.0.0.1`, log limiti)
3. Doğrulama komutu (`nginx -t`, `docker compose config`)
4. Geri alma adımı (önce yedek al, hata olursa geri dön)

### Desen B — Runbook ile Arıza Teşhisi
Bir olay anında önce ilgili [Runbook](../runbooks/index.md) sayfasındaki ilk 3 teşhis komutunu çalıştırıp çıktısını AI'a verin; AI'dan **kök neden hipotezi + salt-okunur doğrulama komutu** isteyin. Yazma/silme/restart içeren komutları doğrulama yapmadan uygulamayın.

### Desen C — PR / Config İncelemesi (Second Pair of Eyes)
Kendi yazdığınız veya başka bir AI oturumunun ürettiği `Dockerfile` / `docker-compose.yml` / Nginx config'i için [AI Denetim Kapıları](ai-audit-gates.md) maddelerine göre denetim yaptırın:
- *"Bu `docker-compose.yml` dosyasını UFW bypass, non-root, resource limit, secret yönetimi ve graceful shutdown açısından denetle; sadece gerçek riskleri listele."*

---

## 3. Uygulama Öncesi Altın Kural (Dry-Run & Backup)

AI'ın önerdiği bir sunucu değişikliğini uygulamadan önce:

```bash
# 1. Değişecek config dosyasının yedeğini al
sudo cp -a /etc/nginx/sites-available/app.conf /etc/nginx/sites-available/app.conf.bak.$(date +%F-%H%M)

# 2. Değişikliği uygula ve mutlaka test et
sudo nginx -t

# 3. Sadece test geçerse reload et (restart yerine reload tercih et)
sudo systemctl reload nginx
```

> **Kural:** SSH (`sshd_config`) veya Firewall (`ufw`) değişikliğinde mevcut SSH oturumunu kapatmadan **ikinci bir terminalden** bağlantıyı test etmeden işlemi bitmiş saymayın. (Acil durum: [SSH Lockout Runbook](../runbooks/ssh-lockout.md))
