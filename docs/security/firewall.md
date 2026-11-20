# Firewall (UFW) Yönetimi

UFW, host'a gelen trafiği varsayılan olarak reddetmek ve yalnızca gerekli girişleri açmak için kullanılır. Public girişleri [port politikasına](../architecture/port-strategy.md) göre sınırlandırın. Bulut firewall veya Security Group kurallarını da kontrol edin.

## 1. Mevcut Kuralları Kontrol Edin

```bash
sudo apt update
sudo apt install ufw
sudo ufw status verbose
sudo ufw status numbered
sudo ufw show added
sudo ss -lntup
```

Çalışan bir sunucuda mevcut kuralları koruyun. Yeni kuralları ekleyip doğruladıktan sonra yalnızca artık gerekmeyen kuralları tek tek kaldırın. Değişiklik öncesi erişilebilir bir sağlayıcı konsolu ve açık bir SSH oturumu tutun. IPv6 etkinse `/etc/default/ufw` içinde `IPV6=yes` ayarını ve `ufw status` çıktısındaki IPv6 kurallarını doğrulayın.

## 2. Gerekli Girişleri Açın

Aktif SSH portunu `ss` çıktısından doğrulayın. Örnekteki IP'yi sabit yönetim IP'niz veya VPN çıkış IP'nizle, `22` değerini aktif SSH portuyla değiştirin. IPv6 üzerinden yönetim yapıyorsanız buna karşılık gelen IPv6 kuralını da ekleyin.

```bash
sudo ufw allow from 203.0.113.10 to any port 22 proto tcp comment 'Yonetim SSH'
```

Sunucu edge reverse proxy çalıştırıyorsa HTTP ve HTTPS'i açın.

```bash
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
```

## 3. Politikayı Uygulayın ve Test Edin

SSH kuralı eklendikten sonra gelen trafik politikasını uygulayın. `enable` komutunu yalnızca UFW kapalıysa kullanın.

```bash
sudo ufw show added
sudo ufw default deny incoming
```

UFW henüz aktif değilse aşağıdaki komutu çalıştırın.

```bash
sudo ufw enable
```

İlk SSH oturumunu açık tutarak ikinci terminalden yeni giriş yapın. Geçici veya geniş erişim kuralı varsa yeni giriş çalıştıktan sonra `sudo ufw status numbered` ile kuralın numarasını doğrulayıp `sudo ufw delete NUMARA` ile yalnızca o kuralı kaldırın. IPv4 ve IPv6 kuralları ayrı görünebilir. Her silmeden sonra listeyi yeniden okuyun ve son kural setiyle tekrar bağlanın.

Çıkış filtresini devreye almadan önce DNS, NTP, paket depoları, log hedefleri, yedekleme ve uygulama bağımlılıklarını envantere alın. Gereken çıkış kurallarını önce ekleyin. Yönetim konsolu açıkken `sudo ufw default deny outgoing` politikasını uygulayın ve bu bağımlılıkları test edin. Docker bridge trafiği için filtreyi Docker ve ağ katmanında ayrıca doğrulayın.

## 4. Docker Portları

Docker'ın yayımladığı portlar UFW'nin host giriş kurallarından önce yönlendirilebilir. UFW durumu tek başına container portunun kapsamını göstermez. Docker'ın paket filtreleme kurallarını etkin bırakın. Public portları yalnızca edge proxy için yayınlayın. Uygulama, veritabanı ve admin UI'ı özel ağda tutun veya host erişimi gerekiyorsa loopback'e bağlayın. [Docker Gateway](docker-gateway.md) · [Docker paket filtreleme belgeleri](https://docs.docker.com/engine/network/packet-filtering-firewalls/)

## 5. Erişim Kesilirse

Sağlayıcı konsolundan `sudo ufw status numbered` ve `sudo ss -lntp` çıktısını kontrol edin. Yönetim IP'niz için doğru porta dar kapsamlı izin ekleyin. Engelleyen bir kural daha önce eşleşiyorsa, kuralları inceleyip yönetim iznini o kuraldan önce `sudo ufw insert NUMARA allow from YONETIM_IP to any port SSH_PORT proto tcp` ile ekleyin. Yeni SSH oturumunu doğrulayıp geçici izinleri gözden geçirin. [SSH erişim kurtarma rehberi](../runbooks/ssh-lockout.md)

## 6. Doğrulama

```bash
sudo ufw status verbose
sudo ufw status numbered
sudo ss -lntup
sudo journalctl -k --since '15 minutes ago' --no-pager | grep 'UFW '
```

`Status: active` ve `deny (incoming)` politikasını, yönetim IP'nizden SSH girişini ve beklenen dinleyicileri doğrulayın. Engellenen trafik görünürlüğü gerekiyorsa `sudo ufw logging low` kullanın. Docker için port eşlemelerini `docker ps` ile ve erişimi yetkili bir istemciden ayrıca doğrulayın.
