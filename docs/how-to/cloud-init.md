# Cloud-Init ve First-Boot Provisioning

Cloud üzerinde her sunucuyu elle kurmak tekrar eden iştir. İlk açılışta:

- kullanıcı,
- hostname,
- timezone,
- locale,
- package update,
- SSH hardening,
- temel script yerleşimi

otomatik gelmelidir.

Bu rehber `cloud-init` ile Day-0 host baseline kurmayı anlatır.

## 1. Ne İçin Kullanılır?

`cloud-init` sunucu ilk açıldığında metadata veya user-data okuyup sistemi bootstrap eder.

En yaygın kullanım alanları:

- sudo kullanıcısı oluşturma
- SSH key ekleme
- hostname / timezone / locale ayarlama
- ilk update/upgrade
- ilk scriptleri yerleştirme
- temel config dosyalarını yazma

## 2. Durum ve Log Kontrolü

Bir instance'ta `cloud-init` çalıştı mı, önce bunu doğrulayın:

```bash
cloud-init status --long
cloud-init analyze blame
journalctl -u cloud-init -u cloud-final --no-pager
tail -n 100 /var/log/cloud-init-output.log
```

Bu dört komut first-boot sorunlarının büyük kısmını anlamanızı sağlar.

## 3. Cloud-Init ile Hangi Baseline Gelmeli?

En azından şunlar otomatik gelmelidir:

- anlamlı bir hostname
- `UTC` timezone
- `C.UTF-8` veya ekip standardı bir locale
- non-root sudo user
- package update / upgrade
- root SSH kapalı, password auth kapalı

Buradaki amaç tüm production provisioning'i tek dosyaya yığmak değil, **minimum güvenli host** üretmektir.

## 4. Temel `#cloud-config` Örneği

Aşağıdaki örnek:

- `deployer` kullanıcısını oluşturur
- hostname belirler
- `UTC` timezone ve sabit locale ayarlar
- SSH key ekler
- ilk update/upgrade'i yapar
- temel paketleri kurar
- bir first-boot scripti yazar
- scripti bir kere çalıştırır

```yaml
#cloud-config
hostname: prod-app-01
fqdn: prod-app-01.example.internal
preserve_hostname: false
timezone: UTC
locale: C.UTF-8

package_update: true
package_upgrade: true
package_reboot_if_required: true

users:
  - default
  - name: deployer
    gecos: Deployer User
    groups: [sudo]
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-ed25519 AAAA... sizin-public-key

disable_root: true
ssh_pwauth: false

packages:
  - curl
  - git
  - jq
  - htop
  - ufw

write_files:
  - path: /usr/local/bin/firstboot.sh
    permissions: '0755'
    owner: root:root
    content: |
      #!/bin/bash
      set -euo pipefail
      timedatectl set-timezone UTC
      timedatectl set-ntp true
      update-locale LANG=C.UTF-8 LC_ALL=C.UTF-8
      ufw default deny incoming
      ufw default allow outgoing
      ufw allow 22/tcp

runcmd:
  - /usr/local/bin/firstboot.sh
  - systemctl enable --now ssh
```

## 5. Bu Örnekte Neler Bilinçli Seçildi?

### `timezone: UTC`

Host timezone için varsayılan öneri budur. Log, alert, DB ve incident tarafında en az sürprizi üretir.

### `locale: C.UTF-8`

Server tarafında script dostu, sade ve öngörülebilir bir varsayılandır.

### `package_reboot_if_required: true`

İlk patch window sonunda reboot gerekiyorsa bunu görünmez bırakmaz. Bu değer cloud provider ve image davranışına göre test edilmelidir.

### `deployer`

Bu örnek bootstrap için non-root sudo user üretir. Daha olgun modelde insan operatörler için ayrı named admin account'lar sonradan eklenmelidir.

## 6. User-Data Geçirme

Cloud provider'a göre user-data alanına bu `#cloud-config` içeriği verilir.

Yükleme sonrası ilk kontroller:

```bash
hostnamectl
timedatectl
locale
id deployer
sudo -l -U deployer
systemctl status cloud-final --no-pager
```

Beklenen Day-0 sonuç:

- host anlamlı bir hostname ile kalkmış olmalı
- timezone `UTC` olmalı
- locale `C.UTF-8` veya ekip standardınız neyse o olmalı
- `deployer` benzeri non-root sudo user hazır olmalı
- root SSH ve password auth kapalı olmalı

## 7. Network ve Cloud-Init İlişkisi

Cloud-init bazen netplan dosyası da yazar. Sonradan static IP'ye geçecekseniz bu belgeyi de kullanın:

- [Netplan, DNS ve Ag Temeli](network-baseline.md)

Eğer `cloud-init` network dosyasını sürekli yeniden yazıyorsa:

```bash
printf 'network: {config: disabled}\n' | sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg
```

Bunu yapmadan önce ilgili instance'in gerçekten `cloud-init` tarafından yönetildiğini doğrulayın.

## 8. Sırlar ve Güvenlik

Asla user-data içine şu tip veri koymayın:

- production DB password
- API token
- private key
- uzun ömürlü secret

Sebep:

- bazı provider'larda metadata servisinden okunabilir
- konsolda görünür olabilir
- image snapshot'larında iz bırakabilir

User-data içine sadece bootstrap mantığı koyun. Secret'leri sonradan güvenli kanaldan enjekte edin.

## 9. Timezone ve Locale Politikası

Cloud-init ile gelen hostlarda bu konu özellikle önemlidir; çünkü image farklı default'larla gelebilir.

Önerilen politika:

- `timezone: UTC`
- `locale: C.UTF-8`

Sebep:

- bootstrap log'ları daha tutarlı olur
- parsing yapan script'ler localized output yüzünden kırılmaz
- farklı cloud region'larda host davranışı benzer kalır

Eğer uygulama veya raporlar Istanbul saatine ihtiyaç duyuyorsa bunu host yerine uygulama katmanında çözmek daha sağlıklıdır.

## 10. Ne Zaman Shell Script, Ne Zaman Cloud-Init?

| İhtiyaç | Doğru Araç |
| :------ | :--------- |
| İlk boot'ta temel host hazırlama | `cloud-init` |
| Tekrarlanabilir uzun kurulum akışı | Bash script |
| Ortama göre farklı parametrelerle bootstrap | `cloud-init` + script birlikte |

En sağlıklı model genelde şudur:

1. `cloud-init` minimum güvenli host'u ayağa kaldırır
2. `/usr/local/bin/*.sh` scriptleri detaylı provisioning yapar
3. Sonraki değişiklikler config management veya CI ile gelir

## 11. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Cloud-init status | `cloud-init status --long` | `status: done` dönmeli |
| Hatalı aşama var mı | `cloud-init analyze blame` | Takılan adımlar görünmemeli |
| Output log | `tail -n 100 /var/log/cloud-init-output.log` | Script hatası olmamalı |
| Hostname | `hostnamectl --static` | Beklenen host adı görünmeli |
| Timezone | `timedatectl show --property=Timezone --value` | `UTC` dönmeli |
| Locale | `locale` | `LANG=C.UTF-8` veya beklenen locale görünmeli |
| Kullanıcı oluştu mu | `id deployer` | Kullanıcı ve `sudo` grubu görünmeli |
| SSH hardening | `sshd -T | grep passwordauthentication` | `no` dönmeli |
| Package baseline | `test -f /var/run/reboot-required && cat /var/run/reboot-required || echo "reboot not required"` | Upgrade sonrası reboot ihtiyacı görünür olmalı |

## 12. No-Go Durumları

Şu durumda cloud-init'i production baseline saymayın:

- first boot log'ları okunmadıysa
- user-data scripti idempotent değilse
- secret'ler plain text gömüldüyse
- ikinci boot'ta aynı adımlar sistem durumunu bozuyorsa
