# Kaynak Sınırlama (Resource Limits) 📉

Bir saldırgan sunucuya sızdığında (RCE), genellikle ilk işi sunucuyu **Crypto Mining** (Kripto Madenciliği) veya **DDoS Saldırısı** için kullanmaktır. Bu durum CPU'yu %100'e kilitler ve sunucuyu sizin için kullanılmaz hale getirir.

Bu rehberde, bir servis hacklense bile sistemin tamamını kilitlemesini (Resource Exhaustion) nasıl engelleyeceğimizi anlatıyoruz.

## 1. Systemd ile Servisleri Kısıtlama (En Etkili Yöntem) 🛡️

Linux'ta servisler genellikle `systemd` ile yönetilir. Systemd, her servisin ne kadar CPU ve RAM kullanacağını çok hassas bir şekilde sınırlayabilir.

### Örnek Senaryo: Web Uygulaması

Diyelim ki `myapp.service` adında bir uygulamanız var.

Dosyayı açın:

```bash
sudo systemctl edit myapp.service --full
```

`[Service]` bloğunun altına şu sınırları ekleyin:

```ini
[Service]
# ... diğer ayarlar ...

# CPU Kısıtlama: %80 (Tek çekirdeğin %80'i)
# Eğer 2 çekirdekli sunucuda max 1 çekirdek kullansın derseniz %100,
# toplamın yarısı olsun derseniz %100 (200 üzerinden) ayarı değişir.
# En garantisi tek çekirdek %80 limiti koymaktır.
CPUQuota=80%

# RAM Kısıtlama: 1GB'a ulaşırsa süreç OOM Killer tarafından öldürülür.
MemoryMax=1G
# RAM dolmaya yaklaşınca swap kullanmasın, direkt engellesin (Opsiyonel)
MemorySwapMax=0

# Fork Bomb Koruması: Aynı anda max 100 alt işlem açabilsin.
TasksMax=100
```

Ayarları uygulayın:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp
```

> **Mantık:** Saldırgan içeri girip Mining başlatsa bile, CPU kullanımı %80'i (veya belirlediğiniz sınırı) geçemez. Sunucu nefes almaya devam eder, SSH ile bağlanıp müdahale edebilirsiniz.

---

## 2. Limits.conf (Kullanıcı Bazlı Sınırlar) 👤

Systemd kullanmayan scriptler veya kullanıcı oturumları için `/etc/security/limits.conf` dosyası kullanılır.

Dosyayı açın:

```bash
sudo nano /etc/security/limits.conf
```

En alta şu satırları ekleyerek bir kullanıcının veya grubun sunucuyu kilitlemesini önleyebilirsiniz:

```nginx
# <domain>      <type>  <item>         <value>

# 'deploy' kullanıcısı max 2GB RAM kullanabilsin
deploy          hard    as             2000000

# 'deploy' kullanıcısı max 50 işlem açabilsin (Fork Bomb önleme)
deploy          hard    nproc          50

# Açık dosya sayısı limiti (Too many open files hatası önlemi)
deploy          soft    nofile         4096
deploy          hard    nofile         8192
```

> **Not:** Bu ayarlar kullanıcı yeniden giriş yaptığında (Login) aktif olur.

---

## 3. Acil Durumda CPU Frenleme (`cpulimit`) 🚑

Eğer halihazırda çalışan ve kontrolden çıkmış bir süreç varsa, onu öldürmeden yavaşlatmak için `cpulimit` aracı kullanılabilir.

Kurulum:

```bash
sudo apt install cpulimit
```

Kullanım (PID ile):

```bash
# 1234 ID'li süreci %50 CPU'ya sabitle
sudo cpulimit -p 1234 -l 50
```

Kullanım (İsim ile):

```bash
# Adı 'python3' olan süreci %30'a sabitle
sudo cpulimit -e python3 -l 30
```

---

## 4. Giden Trafik (Egress) Kısıtlaması 🚧

Saldırganın sunucunuz üzerinden başkalarına DDoS yapmasını engellemek için **Firewall Çıkış Kuralları** şarttır.

Bu konuyu [Firewall Rehberi](firewall.md) içerisinde detaylandırdık.
Mutlaka `ufw default deny outgoing` politikasını uygulayın!

> **Kıssadan Hisse:**
>
> 1.  Systemd ile **CPUQuota** koyun (Mining engeller).
> 2.  UFW ile **Outgoing Deny** yapın (DDoS engeller).
> 3.  `/tmp` **noexec** yapın (Script indirmeyi zorlaştırır).
> 4.  **Otomatik Güncellemeleri** açın (RCE açığını kapatır).

---

## 5. Sistem Geneli Radikal Önlem (Cgroups) ⚡

Eğer "Hangi kullanıcı ne yapıyor umurumda değil, kimse CPU'yu sömüremezsin" diyorsanız, tüm kullanıcı oturumlarına (User Slice) global limit koyabilirsiniz.

Dosyayı oluşturun:

```bash
sudo mkdir -p /etc/systemd/system/user-.slice.d/
sudo nano /etc/systemd/system/user-.slice.d/50-limit.conf
```

İçerik:

```ini
[Slice]
# Hiçbir kullanıcı (root dahil SSH oturumları) CPU'nun %80'inden fazlasını kullanamaz
CPUQuota=80%
# RAM'in %80'inden fazlasını kullanamaz
MemoryMax=80%
```

Uygula:

```bash
sudo systemctl daemon-reload
```

---

## 6. Docker Konteyner Limitleri 🐳

Mining virüsleri en kolay Docker konteynerlerine bulaşır. Eğer limit koymazsanız tüm sunucuyu kilitlerler.

### Docker Run ile

```bash
docker run -d \
  --cpus="0.5" \        # Yarım çekirdek
  --memory="512m" \     # 512MB RAM
  --pids-limit=100 \    # Fork bomb koruması
  my-app
```

### Docker Compose ile (Önerilen)

```yaml
services:
  app:
    image: my-app
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M
```

---

## 7. Özet: Saldırı Zincirini Kırma 🔗

Yaşadığınız **RCE (Remote Code Execution)** saldırısını durdurmak için zincirin halkalarını şöyle kırdık:

| Saldırı Adımı                   | Bizim Önlemimiz         | Sonuç                                             |
| :------------------------------ | :---------------------- | :------------------------------------------------ |
| **1. Giriş** (React RCE)        | **Otomatik Güncelleme** | Açık kapanır, giremez.                            |
| **2. Yayılma** (Container Root) | **User NS / Non-Root**  | (Sonraki adımda Docker güvenliğinde işleyeceğiz). |
| **3. Kaynak Tüketimi** (Mining) | **Resource Limits**     | CPU %100 olamaz, sunucu kilitlenmez.              |
| **4. Dışarı Saldırı** (DDoS)    | **UFW Outbound Deny**   | Dışarı veri/paket gönderemez.                     |
| **5. Gizlenme**                 | **Monitoring Scripts**  | `cpu_alert` ile anında yakalarız.                 |

## 📋 Acil Yapılacaklar Listesi

Saldırı altındaysanız veya hemen önlem almak istiyorsanız:

```bash
# 1. Hemen ve şimdi güncelle!
sudo apt update && sudo apt upgrade -y

# 2. Otomatik güncellemeleri aç (Unattended)
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# 3. Egress Firewall'ı aktifleştir (Dikkatli ol, SSH kopmasın!)
sudo ufw default deny outgoing
sudo ufw allow out 80/tcp
sudo ufw allow out 443/tcp
sudo ufw allow out 53

# 4. Mevcut sistemi tara (Saldırgan izi var mı?)
sudo lynis audit system
```

## Verification

Limit koyduktan sonra gerçekten uygulandığını aşağıdaki kontrollerle doğrulayın:

```bash
# Systemd servisi için aktif limitleri gör
systemctl show myapp.service -p CPUQuota -p MemoryMax -p MemoryHigh -p TasksMax

# Cgroup kullanımını canlı izle
systemd-cgtop

# Kullanıcı limitleri gerçekten yüklenmiş mi
sudo -u deploy bash -lc 'ulimit -u && ulimit -n'

# Docker container limitlerini kontrol et
docker inspect <container> --format '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}} {{.HostConfig.PidsLimit}}'

# Anormal CPU/RAM kullanımını gözlemle
ps -eo pid,ppid,cmd,%cpu,%mem --sort=-%cpu | head
```

Beklenen sonuç:

- `systemctl show` içinde boş olmayan `CPUQuota`, `MemoryMax` ve `TasksMax` değerleri görünmeli.
- `ulimit` çıktısı tanımladığınız kullanıcı limitleriyle uyumlu olmalı.
- `docker inspect` çıktısında limit alanları `0` olmamalı.
- Saldırı veya runaway process simülasyonunda bütün host değil sadece ilgili servis dar boğaza girmeli.
