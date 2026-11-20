# Şüpheli Sunucu ve Yetkisiz Erişim

Ubuntu/Debian sunucusunda tanınmayan bir başarılı giriş, beklenmeyen root yetkisi, yeni SSH anahtarı, servis veya bağlantı gördüğünüzde bu runbook'u açın. Zamanı UTC olarak kaydedin ve olay boyunca aynı zaman aralığını kullanın.

!!! warning "İlk karar"
    Yetkisiz erişime veya devam eden veri aktarımına dair güçlü bulgu varsa, güvenilir bir yönetim konsolundan sunucunun giriş ve çıkış trafiğini izole edin. Yönetim erişimini konsol ya da kontrollü inceleme ağı üzerinden koruyun. Load balancer'dan çıkarmak tek başına ağ izolasyonu sağlamaz.

    İlk incelemede süreç öldürme, restart, reboot, paket veya tarayıcı kurulumu, log temizliği ve bütünlük referansını yenileme işlemlerini erteleyin. Ağ izolasyonu mümkün değilse ve aktif zarar sürüyorsa, olay sorumlusu müdahalenin etkisini ve uçucu kanıt kaybını birlikte değerlendirmelidir.

## 1. Giriş Kayıtları ve Yetkiler

Örnek son 48 saati kapsar. İlk şüpheli olay daha eskiyse aralığı genişletin.

```bash
date -u
hostname
who
sudo journalctl --utc -u ssh.service --since '48 hours ago' --no-pager
sudo journalctl --utc -t sudo --since '48 hours ago' --no-pager
```

- SSH logunda `Accepted` satırındaki kullanıcıyı, saati, kaynak IP'yi ve varsa anahtar parmak izini bilinen VPN, bastion ve deploy kayıtlarıyla karşılaştırın. Başarısız denemeler tarama veya parola tahmini sinyali verir. Başarılı girişin yetkili olup olmadığını envanter ve ayrı log kaynağıyla doğrulayın.
- İmaj SSH kayıtlarını dosyada tutuyorsa, mevcut `/var/log/auth.log` ve rotasyonlarını da kontrol edin. Log hiç yoksa veya zaman aralığında boşluk varsa kayıt kaynağını, retention'ı ve aynı aralıktaki sunucu dışı logları kontrol edin.
- Cloud konsolu, IAM, instance erişim araçları, CI deploy ve uygulama girişleri ayrı kayıtlar üretir. Şüpheli erişim SSH dışında başlamış olabilir.

```bash
getent passwd | awk -F: '$3 == 0 {print $1, $6}'
getent group sudo
sudo sshd -T | grep -E '^(authorizedkeysfile|authorizedkeyscommand|trustedusercakeys) '
```

UID 0 hesaplarını, yetkili kullanıcıları ve `sudoers` değişikliklerini onaylı envanterle karşılaştırın. SSH yapılandırmasında `Match` blokları varsa gerçek bağlantı bağlamıyla `sshd -T -C` kullanın. Şüpheli hesabın etkin `AuthorizedKeysFile` yolunda anahtarları parmak iziyle inceleyin. Örnek varsayılan yolu kullanır.

```bash
sudo ssh-keygen -lf /home/deployer/.ssh/authorized_keys
```

## 2. CPU, Süreç ve Bağlantılar

```bash
uptime
vmstat 1 6
ps -eo pid,ppid,user,stat,etime,pcpu,comm --sort=-pcpu | head -n 20
ps -eo pid,ppid,stat,comm | awk 'NR == 1 || $3 ~ /^Z/'
sudo ss -lntup
sudo ss -Htnp state established
```

- `vmstat` ilk veri satırında CPU için açılıştan beri ortalamayı, sonraki satırlarda örnekleme aralıklarını gösterir. `us` ve `sy` CPU kullanımını, `wa` disk veya diğer I/O beklemesini, `st` sanallaştırma kaynaklı beklemeyi araştırmak için ayrıştırın. `ps` CPU yüzdesi süreç ömrü ortalamasıdır. Anlık kullanım için `top` ile birkaç yenileme izleyin.
- `Z` veya `<defunct>` bitmiş ve ebeveyni tarafından toplanmamış bir süreçtir. O anda CPU harcamaz. Birikiyorsa `PPID` üzerinden ilgili uygulamayı inceleyin. CPU sıçramasını backup, zamanlanmış işler, deploy ve trafik artışıyla karşılaştırın. Normal CPU seviyesinde de yetkisiz erişim sürebilir.
- `ss` çıktısındaki yerel ve karşı uçları PID ile eşleştirin. Bu anlık görünüm, bağlantının yönünü veya geçmişini tek başına vermez. Kısa ömürlü bağlantılar ve container ağları için mevcut ağ, proxy veya sağlayıcı akış kayıtlarına bakın.

Bir PID tanınmıyorsa örnekteki numarayı gerçek PID ile değiştirin. Sahibi, ebeveyni, dosya yolu ve cgroup bilgilerini kayıt altına alın. Bir süreç güncelleme sonrası da silinmiş bir dosyayı kullanmaya devam edebilir. Yol ve zaman bilgilerini deploy kaydıyla karşılaştırın.

```bash
pid=1234
ps -p "$pid" -o pid,ppid,user,lstart,stat,comm
sudo readlink "/proc/$pid/exe"
sudo cat "/proc/$pid/cgroup"
systemctl status "$pid" --no-pager
```

Docker kullanılıyorsa çalışan ve durmuş container'ları bilinen Compose servisleri ve deploy edilmiş imajlarla karşılaştırın.

```bash
sudo docker ps -a --no-trunc --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
sudo docker stats --no-stream
```

## 3. Beklenmeyen Kalıcılık

```bash
systemctl list-unit-files --type=service --no-pager
systemctl list-timers --all --no-pager
sudo ls -la /etc/systemd/system /etc/cron.d /var/spool/cron/crontabs
sudo crontab -u root -l
```

Service ve timer listesini bilinen kurulumla karşılaştırın. Şüpheli unit için `systemctl cat UNIT` ile kaynak dosyayı ve drop-in'leri görün. Varsa şüpheli kullanıcının crontab'ını ve kullanıcı seviyesindeki systemd unit'lerini de kontrol edin. Eksik dizin, crontab veya log için komutun döndürdüğü durumu kaydedin. Önceden kurulmuş [AIDE](../security/fim.md) için güvenilir sunucu dışı referans kullanın.

## 4. Kanıt, İzolasyon ve Kurtarma

1. Zaman aralığını, host kimliğini, komutları, çıktıları, hata mesajlarını ve yapılan müdahaleleri kaydedin. Kopyaları yetkisi sınırlı, sunucu dışı depoda saklayın. Şifreleri, token'ları ve tam logları genel kanallara göndermeyin. Bulut disk snapshot'ının kimliğini kaydedin. Disk snapshot'ı RAM'deki uçucu veriyi içermez.
2. Yerel kayıtları merkezi loglar, sağlayıcı denetim kayıtları ve bilinen deploy geçmişiyle karşılaştırın. Root yetkisine ulaşıldıysa yerel log ve araçlar değiştirilmiş olabilir. Tarama sonucu temiz görünse de bu olasılığı hesaba katın.
3. Root erişimi doğrulanırsa veya sistem bütünlüğünü güvenilir biçimde kuramıyorsanız, etkilenen sunucuyu izole tutun ve doğrulanmış imajdan yeniden kurun. İlk erişim yolunu kapatın. Etkilenmiş anahtarları, API token'larını ve diğer kimlik bilgilerini güvenilir bir sistemden iptal edip döndürün. Yedeğin olay öncesine ait sürümünü ve içeriğini doğrulayarak geri yükleyin.

[CISA olay müdahalesi kontrol listesi](https://www.cisa.gov/sites/default/files/2025-03/StopRansomware-Guide%20508.pdf) · [NIST olay müdahalesi önerileri](https://csrc.nist.gov/pubs/sp/800/61/r3/final)

## 5. Doğrulama

Yeni veya kurtarılan host'u trafiğe almadan önce:

```bash
sudo sshd -t
sudo ss -lntup
sudo journalctl --utc -u ssh.service --since '30 minutes ago' --no-pager
```

- Beklenen SSH hesabıyla test girişi yapın ve olayın merkezi loga doğru host ve saatle ulaştığını doğrulayın.
- Dinleyen portları, container'ları, systemd unit'lerini ve timer'ları onaylı envanterle karşılaştırın.
- Etkilenmiş kimlik bilgilerinin iptal edildiğini ve ilk erişim yolunun kapandığını doğrulayın. Trafiği kademeli açıp [üretime hazırlık kontrollerini](../checklists/prod-ready.md) tamamlayın.

Sinyal bilinen bir iş yüküyle örtüşüyorsa [CPU Spike](cpu-spike.md) rehberiyle devam edin. Düzenli izleme için [Güvenlik İzleme](../security/monitoring.md) ve [Merkezi Loglama](../how-to/centralized-logging.md) sayfalarına dönün.
