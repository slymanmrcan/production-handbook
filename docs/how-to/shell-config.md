# Shell Konfigürasyonu (.bashrc, Alias, PATH) 🐚

Linux'ta terminal açtığınızda hangi ayarların yüklendiğini, alias'ların nasıl tanımlandığını ve PATH değişkeninin nasıl yönetildiğini anlatan rehber.
---
## 📁 Shell Konfigürasyon Dosyaları {#konfigurasyon-dosyalari}

### Dosyalar ve Yüklenme Sırası

Linux'ta birden fazla konfigürasyon dosyası vardır ve **hangi dosyanın ne zaman yüklendiği** önemlidir.

#### Login Shell (SSH ile bağlanınca)

```text
1. /etc/profile           # Sistem geneli (tüm kullanıcılar)
2. ~/.bash_profile        # Kullanıcıya özel (varsa)
   VEYA
   ~/.bash_login          # .bash_profile yoksa
   VEYA
   ~/.profile             # İkisi de yoksa
3. ~/.bashrc              # Genelde .bash_profile içinden çağrılır
```

#### Non-Login Shell (Terminal açınca)

```text
1. ~/.bashrc              # Sadece bu yüklenir
```

### Hangi Dosyayı Kullanmalıyım?

| Dosya               | Ne Zaman Kullanılır           | Örnek                        |
| :------------------ | :---------------------------- | :--------------------------- |
| **~/.bashrc**       | Alias, fonksiyonlar, prompt   | `alias ll='ls -la'`          |
| **~/.bash_profile** | PATH, ortam değişkenleri      | `export PATH=$PATH:/opt/bin` |
| **~/.profile**      | Ubuntu'da .bash_profile yoksa | Aynı işlev                   |
| **/etc/profile**    | Sistem geneli ayarlar (root)  | Tüm kullanıcılar için        |

> [!TIP] > **En Pratik Yöntem:** Her şeyi `~/.bashrc`'ye yazın. Çünkü genelde `.bash_profile` içinde zaten `.bashrc` çağrılır:
>
> ```bash
> # ~/.bash_profile içeriği (varsayılan)
> if [ -f ~/.bashrc ]; then
>     . ~/.bashrc
> fi
> ```

---

## 🔗 Alias Tanımlama {#alias-tanimlama}

Alias, uzun komutları kısaltmak için kullanılır. **Kalıcı** olması için `~/.bashrc` dosyasına eklenir.

### Basit Alias'lar

```bash
# ~/.bashrc dosyasını aç
nano ~/.bashrc

# Dosyanın sonuna ekle:
alias ll='ls -lah'
alias la='ls -A'
alias l='ls -CF'

# Güvenlik için (yanlışlıkla silmeyi önle)
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# Hızlı navigasyon
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'

# Docker kısayolları
alias dps='docker ps'
alias dpsa='docker ps -a'
alias dimg='docker images'
alias dlog='docker logs -f'

# Git kısayolları
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline'

# Sistem bilgisi
alias meminfo='free -m -l -t'
alias diskinfo='df -h'
alias cpuinfo='lscpu'
```

### Parametreli Alias'lar (Fonksiyon Olarak)

Alias parametre alamaz, bunun için **fonksiyon** kullanmalısınız:

```bash
# ~/.bashrc

# Docker container'a gir
dexec() {
    docker exec -it "$1" /bin/bash
}

# Git commit + push
gcp() {
    git add .
    git commit -m "$1"
    git push
}

# Dosya yedekle
backup() {
    cp "$1" "$1.backup.$(date +%Y%m%d_%H%M%S)"
}

# Port dinleyen process'i bul
port() {
    sudo lsof -i :"$1"
}

# Kullanım:
# dexec mycontainer
# gcp "Fix bug"
# backup config.yml
# port 8080
```

### Alias'ları Aktif Etme

```bash
# Değişiklikleri yükle (yeni terminal açmadan)
source ~/.bashrc

# Veya kısa yolu:
. ~/.bashrc

# Tüm alias'ları listele
alias

# Belirli bir alias'ı göster
alias ll
```

---

## 🛤️ PATH Yönetimi {#path-yonetimi}

`PATH`, sistemin komutları nerede arayacağını belirten ortam değişkenidir.

### Mevcut PATH'i Görüntüleme

```bash
# PATH'i göster
echo $PATH

# Daha okunabilir (her dizin ayrı satırda)
echo $PATH | tr ':' '\n'
```

### PATH'e Dizin Ekleme

**Geçici (sadece o oturum için):**

```bash
export PATH=$PATH:/opt/myapp/bin
```

**Kalıcı (her oturumda):**

```bash
# ~/.bashrc dosyasını aç
nano ~/.bashrc

# Dosyanın sonuna ekle:
export PATH=$PATH:/opt/myapp/bin
export PATH=$PATH:$HOME/.local/bin
export PATH=$PATH:/usr/local/go/bin

# Yükle
source ~/.bashrc
```

### PATH Sırası Önemlidir!

```bash
# Yeni dizini SONA ekle (mevcut komutlar öncelikli)
export PATH=$PATH:/new/dir

# Yeni dizini BAŞA ekle (yeni komutlar öncelikli)
export PATH=/new/dir:$PATH
```

**Örnek:** Eğer `/usr/bin/python` ve `/opt/python/bin/python` varsa:

```bash
# /opt/python öncelikli olsun
export PATH=/opt/python/bin:$PATH
```

---

## 🌍 Ortam Değişkenleri {#ortam-degiskenleri}

### Yaygın Ortam Değişkenleri

```bash
# ~/.bashrc

# Varsayılan editör
export EDITOR=nano
export VISUAL=nano

# Dil ayarları
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# History ayarları
export HISTSIZE=10000
export HISTFILESIZE=20000
export HISTCONTROL=ignoredups:erasedups

# Node.js
export NODE_ENV=production

# Go
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Python
export PYTHONPATH=$HOME/python-libs

# Java
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin
```

### Ortam Değişkenini Görüntüleme

```bash
# Belirli bir değişken
echo $HOME
echo $USER
echo $PATH

# Tüm ortam değişkenleri
env

# Veya
printenv

# Belirli bir değişkeni ara
env | grep JAVA
```

---

## 🎨 Prompt Özelleştirme {#prompt-ozellestirme}

`PS1` değişkeni, terminal prompt'unuzu (komut satırı başındaki yazı) özelleştirir.

### Varsayılan Prompt

```bash
# Ubuntu varsayılan
user@hostname:~$

# CentOS varsayılan
[user@hostname ~]$
```

### Özel Prompt Örnekleri

```bash
# ~/.bashrc

# Basit (sadece dizin)
export PS1="\w $ "

# Renkli (kullanıcı@host:dizin)
export PS1="\[\e[32m\]\u@\h\[\e[0m\]:\[\e[34m\]\w\[\e[0m\]\$ "

# Git branch göster (gelişmiş)
parse_git_branch() {
    git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/ (\1)/'
}
export PS1="\[\e[32m\]\u@\h\[\e[0m\]:\[\e[34m\]\w\[\e[33m\]\$(parse_git_branch)\[\e[0m\]\$ "

# Zaman ekle
export PS1="[\t] \u@\h:\w\$ "
```

**Renk Kodları:**

```bash
\[\e[30m\]  # Siyah
\[\e[31m\]  # Kırmızı
\[\e[32m\]  # Yeşil
\[\e[33m\]  # Sarı
\[\e[34m\]  # Mavi
\[\e[35m\]  # Mor
\[\e[36m\]  # Cyan
\[\e[37m\]  # Beyaz
\[\e[0m\]   # Reset (renksiz)
```

**Özel Karakterler:**

```bash
\u  # Kullanıcı adı
\h  # Hostname
\w  # Tam dizin yolu
\W  # Sadece dizin adı
\t  # Saat (24 saat)
\d  # Tarih
\$  # $ (normal kullanıcı) veya # (root)
```

---

## 🔄 Ubuntu vs CentOS Farkları {#ubuntu-centos-farklari}

### Dosya Konumları

| Özellik               | Ubuntu             | CentOS/RHEL       |
| :-------------------- | :----------------- | :---------------- |
| **Kullanıcı bashrc**  | `~/.bashrc`        | `~/.bashrc`       |
| **Kullanıcı profile** | `~/.profile`       | `~/.bash_profile` |
| **Sistem bashrc**     | `/etc/bash.bashrc` | `/etc/bashrc`     |
| **Sistem profile**    | `/etc/profile`     | `/etc/profile`    |

### Varsayılan Alias'lar

**Ubuntu (`~/.bashrc`):**

```bash
alias ls='ls --color=auto'
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
```

**CentOS (`~/.bashrc`):**

```bash
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'
alias ll='ls -l --color=auto'
```

### Yükleme Davranışı

**Ubuntu:**

```bash
# ~/.profile içinde:
if [ -n "$BASH_VERSION" ]; then
    if [ -f "$HOME/.bashrc" ]; then
        . "$HOME/.bashrc"
    fi
fi
```

**CentOS:**

```bash
# ~/.bash_profile içinde:
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi
```

---

## 🛠️ Pratik Örnekler

### 1. Production Server İçin Alias Seti

```bash
# ~/.bashrc

# Güvenlik
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# Docker
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
alias dlogs='docker logs -f --tail 100'
alias dstats='docker stats --no-stream'

# Sistem
alias ports='sudo netstat -tulpn | grep LISTEN'
alias memtop='ps aux --sort=-%mem | head -10'
alias cputop='ps aux --sort=-%cpu | head -10'

# Log izleme
alias nginx-log='tail -f /var/log/nginx/access.log'
alias app-log='tail -f /var/log/myapp/app.log'

# Disk
alias diskspace='du -h --max-depth=1 | sort -hr'
alias bigfiles='find . -type f -size +100M -exec ls -lh {} \;'
```

### 2. Development Environment

```bash
# ~/.bashrc

# Git
alias gs='git status'
alias gd='git diff'
alias gl='git log --oneline --graph --all'
alias gco='git checkout'
alias gcb='git checkout -b'

# Node.js
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Python
alias python=python3
alias pip=pip3
export PATH=$PATH:$HOME/.local/bin

# Proje kısayolları
alias cdp='cd ~/projects'
alias cdapi='cd ~/projects/api'
alias cdfrontend='cd ~/projects/frontend'
```

### 3. Sistem Yöneticisi İçin

```bash
# ~/.bashrc

# Servis yönetimi
alias sysstart='sudo systemctl start'
alias sysstop='sudo systemctl stop'
alias sysrestart='sudo systemctl restart'
alias sysstatus='sudo systemctl status'

# Log analizi
alias errors='sudo journalctl -p err -n 50'
alias warnings='sudo journalctl -p warning -n 50'

# Network
alias myip='curl -s ifconfig.me'
alias localip='hostname -I'
alias openports='sudo ss -tulpn'

# Backup fonksiyonu
backup_config() {
    local file=$1
    local backup_dir="/opt/backups/configs"
    sudo mkdir -p "$backup_dir"
    sudo cp "$file" "$backup_dir/$(basename $file).$(date +%Y%m%d_%H%M%S)"
    echo "Backup: $backup_dir/$(basename $file).$(date +%Y%m%d_%H%M%S)"
}
```

---

## 🔍 Troubleshooting

### Değişiklikler Yüklenmiyor

```bash
# Syntax hatası var mı kontrol et
bash -n ~/.bashrc

# Hata varsa detaylı göster
bash -x ~/.bashrc

# Manuel yükle
source ~/.bashrc
```

### Hangi Dosya Yükleniyor?

```bash
# Login shell mi?
echo $0
# -bash ise login shell

# Hangi dosyalar yüklendi?
set | grep BASH_SOURCE
```

### Alias Çalışmıyor

```bash
# Alias tanımlı mı?
alias myalias

# Fonksiyon mu alias mı?
type myalias

# .bashrc yüklendi mi?
echo $BASH_VERSION
```

---

## 📚 Referanslar

- [Bash Manual](https://www.gnu.org/software/bash/manual/)
- [Ubuntu Bash Startup Files](https://help.ubuntu.com/community/EnvironmentVariables)
- [RHEL Shell Configuration](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/assembly_customizing-the-shell-prompt_configuring-basic-system-settings)
