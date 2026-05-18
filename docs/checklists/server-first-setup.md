# Server Verification Protocol (Day 0) 🛡️

Bir sunucuyu teslim aldığınızda "yaptım oldu" demek yetmez. **Doğrulamak (Verify)** zorundasınız.

## 1. Access & Identity

| Aksiyon       | Komut                                           | Doğrulama (Verify)                                                          |
| :------------ | :---------------------------------------------- | :-------------------------------------------------------------------------- |
| **Update**    | `apt update && apt full-upgrade -y`             | `apt list --upgradable` çıktısı boş veya minimal olmalı.                    |
| **Hostname**  | `hostnamectl set-hostname <name>`               | `hostname` komutu yeni ismi dönmeli.                                        |
| **Locale**    | `update-locale LANG=C.UTF-8 LC_ALL=C.UTF-8`     | `locale` çıktısında `LANG=C.UTF-8` görünmeli.                               |
| **Sudo User** | `adduser deployer && usermod -aG sudo deployer` | `getent group sudo` çıktısında `deployer` görünmeli.                        |
| **SSH Key**   | (Local) `ssh-copy-id deployer@<IP>`             | `ssh -o PreferredAuthentications=publickey deployer@<IP>` şifresiz girmeli. |
| **Sudo Test** | `sudo -l -U deployer`                           | `deployer` için beklenen sudo yetkileri görünmeli.                          |
| **Saat Senkronu** | `timedatectl set-ntp true`                  | `timedatectl show --property=NTPSynchronized --value` -> `yes` olmalı.      |

## 2. SSH Hardening (Kritik) 🔒

Dosya: `/etc/ssh/sshd_config`

| Parametre                | Değer  | Neden?                               | Doğrulama |
| :----------------------- | :----- | :----------------------------------- | :--------- |
| `PermitRootLogin`        | `no`   | Root brute-force engellemek için.    | `sshd -T | grep -E '^permitrootlogin no$'` çıktısı dönmeli. |
| `PasswordAuthentication` | `no`   | Sadece Key ile giriş.                | `sshd -T | grep -E '^passwordauthentication no$'` çıktısı dönmeli. |
| `PubkeyAuthentication`   | `yes`  | Key tabanlı erişim zorunlu.          | `sshd -T | grep -E '^pubkeyauthentication yes$'` çıktısı dönmeli. |
| `PermitEmptyPasswords`   | `no`   | Güvenlik.                            | `sshd -T | grep -E '^permitemptypasswords no$'` çıktısı dönmeli. |
| `Port`                   | `2222` | (Opsiyonel) Log kirliliğini azaltır. | `sshd -T | grep -E '^port 2222$'` ve `ss -tulpn | grep ':2222 '` çıktısı dönmeli. |
| `AllowUsers`             | `deployer` | Yetkisiz kullanıcı girişini kesmek için. | `sshd -T | grep -E '^allowusers deployer$'` çıktısı dönmeli. |

> **Not:** Değişiklikten sonra `sshd -t` (Test Config) yapmadan servisi restart etmeyin!

## 3. Firewall (UFW) 🧱

Kural: **Default Deny Incoming.**

```bash
# Kurulum
apt install ufw
ufw default deny incoming
ufw default allow outgoing

# İzinler
ufw allow ssh  # Veya port 2222
ufw allow 80/tcp
ufw allow 443/tcp

# Aktifleştir
ufw enable
```

**✅ Verify Step:**

```bash
ufw status verbose
# Çıktı: "Status: active" ve "Default: deny (incoming)" OLMALIDIR.
```

Ek kontrol:

```bash
ss -ltnp
# Sadece beklenen SSH/HTTP/HTTPS portları public bind edilmiş olmalı.
```

## 4. System Hardening ⚙️

| Ayar            | Dosya/Komut                                                         | Verify                                                                |
| :-------------- | :------------------------------------------------------------------ | :-------------------------------------------------------------------- |
| **Timezone**    | `timedatectl set-timezone UTC`                                      | `timedatectl show --property=Timezone --value` -> `UTC` olmalı.       |
| **Swappiness**  | `/etc/sysctl.conf` -> `vm.swappiness=10`                            | `cat /proc/sys/vm/swappiness` -> 10 olmalı.                           |
| **TCP BBR**     | `net.core.default_qdisc=fq` + `net.ipv4.tcp_congestion_control=bbr` | `sysctl net.ipv4.tcp_congestion_control` -> bbr olmalı.               |
| **Auto Update** | `apt install unattended-upgrades`                                   | `systemctl status unattended-upgrades` -> Active olmalı.              |
| **Fail2Ban**    | `apt install fail2ban`                                              | `fail2ban-client status sshd` -> Hapisteki (Jail) IP'leri göstermeli. |
| **Journal Sağlığı** | `journalctl --disk-usage`                                        | Journal kullanımı makul görünmeli; boot hatası için `journalctl -p err -b` boş veya beklenen olmalı. |
| **Failed Units** | `systemctl --failed`                                               | `0 loaded units listed` veya bilinçli istisnalar görünmeli.           |

## 5. Docker & Runtime Baseline 🐳

Henüz uygulama deploy etmemiş olsanız bile temel runtime hazır olmalı.

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| **Docker Service** | `systemctl is-active docker` | `active` dönmeli. |
| **Docker Version** | `docker version --format '{{.Server.Version}}'` | Server versiyonu dönmeli. |
| **Compose Plugin** | `docker compose version` | V2 compose plugin görünmeli. |
| **User Group** | `id deployer` | `docker` grubu gerekiyorsa görünmeli. |
| **Socket Rights** | `stat -c '%U %G %a' /var/run/docker.sock` | Genelde `root docker 660` benzeri dar izinler görünmeli. |

## 6. Final Smoke Test 🚬

| Adım | Komut / İşlem | Beklenen Sonuç |
| :--- | :------------ | :------------- |
| **Reboot** | `reboot` | Host kontrollü şekilde yeniden başlamalı. |
| **Boot Time** | `who -b` | Son boot zamanı güncel görünmeli. |
| **Uptime** | `uptime` | Sistem oturmuş görünmeli, anormal load olmamalı. |
| **SSH Reconnect** | (Local) `ssh deployer@<IP>` | Yeni SSH oturumu sorunsuz açılmalı. |
| **Error Log** | `journalctl -p err -b --no-pager` | Kritik boot/runtime hatası görünmemeli. |
| **Docker Test** | `sudo docker ps` | Hata vermeden çalışmalı. |
| **Firewall Persist** | `ufw status verbose` | Reboot sonrası hala `active` görünmeli. |
