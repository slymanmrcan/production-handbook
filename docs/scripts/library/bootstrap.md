# Server Bootstrap Script 🛡️

Bu script, **boş bir Ubuntu/Debian sunucuyu** (Fresh Install) tek komutla "Prod-Ready" hale getirir.

> **GÜNCELLEME (v3):** Idempotent config yazımı, daha sıkı SSH/Docker hardening, `curl | sh` kaldırımı ve doğrulama adımları güçlendirildi.

## Özellikler

- **Kullanıcı:** `deployer` kullanıcısı (Sudo yetkisiyle).
- **SSH:** Port 2222, Root Login Kapalı, Timeout ayarları.
- **Güvenlik:** UFW, Fail2Ban (SSH korumalı), Kernel Hardening.
- **Sistem:** Timezone (Europe/Istanbul), Swap, Auto-Upgrades.
- **Docker:** Docker Engine + Compose v2.

## Kullanım

Scripti sunucuda bir dosyaya yapıştırın ve çalıştırın.

```bash
nano setup.sh
# Kodu yapıştır
chmod +x setup.sh
./setup.sh
```

## Kaynak Kod

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

# --- CONFIG ---
NEW_USER="${NEW_USER:-deployer}"
SSH_PORT="${SSH_PORT:-2222}"
SWAP_SIZE="${SWAP_SIZE:-2G}"
TIMEZONE="${TIMEZONE:-Europe/Istanbul}"
LOG_FILE="${LOG_FILE:-/var/log/server-setup.log}"
SSH_CONF_DIR="/etc/ssh/sshd_config.d"
SSH_OVERRIDE_FILE="${SSH_CONF_DIR}/90-server-hardening.conf"
SYSCTL_FILE="/etc/sysctl.d/99-server-hardening.conf"
F2B_FILE="/etc/fail2ban/jail.d/server-hardening.local"
# --------------

log() {
  printf '[bootstrap] %s\n' "$*"
}

die() {
  printf '[bootstrap] ERROR: %s\n' "$*" >&2
  exit 1
}

require_root() {
  [[ ${EUID:-$(id -u)} -eq 0 ]] || die "root olarak calistirin"
}

ensure_line() {
  local file="$1"
  local line="$2"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  grep -Fxq "$line" "$file" || printf '%s\n' "$line" >> "$file"
}

ufw_allow_once() {
  local rule="$1"
  if ufw status numbered 2>/dev/null | grep -Fq "$rule"; then
    return 0
  fi
  ufw allow "$rule"
}

require_root
mkdir -p /var/log
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1
trap 'die "komut basarisiz oldu (satir ${LINENO})"' ERR

log "sunucu kurulumu baslatiliyor: $(date '+%F %T')"

# 1. Backup SSH Config
if [ -f /etc/ssh/sshd_config ]; then
  cp -n /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
fi

# 2. Update
export DEBIAN_FRONTEND=noninteractive
log "paketler guncelleniyor"
apt-get update
apt-get upgrade -y
apt-get install -y ufw fail2ban git unattended-upgrades \
  htop vim tmux ncdu net-tools docker.io docker-compose-plugin

# 3. Timezone
log "timezone ayarlaniyor: ${TIMEZONE}"
timedatectl set-timezone "$TIMEZONE"
if command -v locale-gen >/dev/null 2>&1; then
  locale-gen en_US.UTF-8
fi
update-locale LANG=en_US.UTF-8

# 4. Create User
if id "$NEW_USER" >/dev/null 2>&1; then
  log "kullanici zaten var: ${NEW_USER}"
else
  log "kullanici olusturuluyor: ${NEW_USER}"
  adduser --gecos "" --disabled-password "$NEW_USER"
fi
usermod -aG sudo "$NEW_USER"
passwd -l "$NEW_USER" >/dev/null 2>&1 || true
install -d -m 0700 -o "$NEW_USER" -g "$NEW_USER" "/home/$NEW_USER/.ssh"
auth_keys="/home/$NEW_USER/.ssh/authorized_keys"
if [ ! -f "$auth_keys" ]; then
  install -m 0600 -o "$NEW_USER" -g "$NEW_USER" /dev/null "$auth_keys"
else
  chown "$NEW_USER:$NEW_USER" "$auth_keys"
  chmod 600 "$auth_keys"
fi
if [ ! -s "$auth_keys" ] && [ -f /root/.ssh/authorized_keys ]; then
  install -m 0600 -o "$NEW_USER" -g "$NEW_USER" /root/.ssh/authorized_keys "$auth_keys"
elif [ ! -s "$auth_keys" ]; then
  log "uyari: /root/.ssh/authorized_keys bulunamadi; anahtar girisi elle eklenmeli"
fi

# 5. SSH Hardening
log "ssh sertlestiriliyor (port: ${SSH_PORT})"
install -d -m 0755 "$SSH_CONF_DIR"
cat > "$SSH_OVERRIDE_FILE" <<EOF
Port ${SSH_PORT}
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowAgentForwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 30
AllowUsers ${NEW_USER}
EOF

ssh_service="ssh"
if systemctl list-unit-files | awk '{print $1}' | grep -qx 'sshd.service'; then
  ssh_service="sshd"
fi

sshd -t
systemctl restart "$ssh_service"

# 6. Firewall (UFW)
log "firewall ayarlaniyor"
ufw default deny incoming
ufw default allow outgoing
ufw_allow_once "${SSH_PORT}/tcp"
ufw_allow_once "80/tcp"
ufw_allow_once "443/tcp"
ufw --force enable

# 7. Fail2Ban
log "fail2ban ayarlaniyor"
install -d -m 0755 /etc/fail2ban/jail.d
cat > "$F2B_FILE" <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ${SSH_PORT}
mode = aggressive
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable --now fail2ban
systemctl restart fail2ban

# 8. Docker Install
log "docker kurulumu kontrol ediliyor"
if ! command -v docker >/dev/null 2>&1; then
  die "docker binary kurulamadı"
fi
if systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '$1 == "docker.service" { found = 1 } END { exit found ? 0 : 1 }'; then
  systemctl enable --now docker
else
  log "uyari: docker.service bulunamadi; servis elle dogrulanmali"
fi
usermod -aG docker "$NEW_USER" || true

# 9. Swap Setup
if swapon --show | awk 'NR>1 { found=1 } END { exit !found }'; then
  log "swap zaten aktif"
else
  log "swap olusturuluyor: ${SWAP_SIZE}"
  if [ ! -f /swapfile ]; then
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  ensure_line /etc/fstab '/swapfile none swap sw 0 0'
fi

# 10. Unattended Upgrades
log "otomatik guncellemeler ayarlaniyor"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# 11. Kernel Hardening
log "kernel hardening uygulanıyor"
cat > "$SYSCTL_FILE" <<EOF
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
vm.swappiness = 10
EOF
sysctl --system

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ Kurulum Tamamlandi!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📋 ÖZET:"
echo "   • Kullanıcı: $NEW_USER"
echo "   • SSH Port: $SSH_PORT"
echo "   • Firewall: Aktif (80, 443, $SSH_PORT)"
echo "   • Fail2Ban: Aktif"
echo "   • Docker: Kurulu"
echo ""
echo "⚠️  ÖNEMLİ ADIMLAR:"
echo "   1. Mevcut terminali kapatmayın."
echo "   2. Yeni terminal açıp test edin:"
echo "      ssh -p $SSH_PORT $NEW_USER@<SERVER_IP>"
echo "   3. Bağlantı başarılıysa sunucuyu reboot edin:"
echo "      sudo reboot"
echo ""
echo "🔎 Doğrulama:"
echo "   • sshd -T | grep -E '^(port|permitrootlogin|passwordauthentication|kbdinteractiveauthentication|allowusers)'"
echo "   • ufw status verbose"
echo "   • systemctl is-active fail2ban docker"
echo "   • swapon --show"
echo "   • sysctl vm.swappiness"
echo "📝 Log dosyası: $LOG_FILE"
echo "════════════════════════════════════════════════════"
```

## Doğrulama

Kurulumdan sonra yeni terminalde şu kontrolleri yapın:

```bash
sshd -T | grep -E '^(port|permitrootlogin|passwordauthentication|kbdinteractiveauthentication|allowusers)'
ufw status verbose
systemctl is-active fail2ban docker
swapon --show
sysctl vm.swappiness
getent group sudo | grep -F deployer
sudo -l -U deployer
```

Beklenen sonuç:

- SSH sadece tanımlı portta dinlemeli ve password login kapalı olmalı.
- UFW `active` dönmeli.
- `fail2ban` ve `docker` `active` olmalı.
- `swapon --show` ile `/swapfile` görünmeli.
- `vm.swappiness` `10` dönmeli.
- `deployer` sudo grubunda görünmeli ve `sudo -l` hata vermemeli.
