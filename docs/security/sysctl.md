# Kernel Hardening (Sysctl)

Bu bölüm, Linux çekirdeğini (kernel) ağ saldırılarına ve yetki yükseltme (privilege escalation) girişimlerine karşı "çelik yelek" giydirmeyi hedefler.

> [!NOTE] > **Bu ayarlar ne işe yarar?**
> Varsayılan Linux ayarları "maksimum uyumluluk" içindir. Biz bunu "maksimum güvenlik" olarak değiştireceğiz.
>
> 📖 **Detaylı Açıklama:** Hangi ayarın (0 veya 1) ne anlama geldiğini, `rp_filter`, `accept_redirects` gibi terimlerin ne olduğunu merak ediyorsanız [Kernel Parametreleri Sözlüğü (Glossary)](sysctl-glossary.md) sayfasına bakın.

## 1. Uygulama

## ⚠️ Docker/Kubernetes Kullanıcıları DİKKAT!

Eğer **Docker** veya **Kubernetes** kullanıyorsanız:

### IP Forwarding KAPATILAMAZ!

```bash
# Bu satırları YORUMA ALIN veya SİLİN:
# net.ipv4.conf.all.forwarding = 0
# net.ipv6.conf.all.forwarding = 0
```

**Neden?** Docker container'lar arası iletişim için IP forwarding gerekir.

**Kontrol:**

```bash
# Docker varsa:
docker ps &>/dev/null && echo "Docker aktif, forwarding=1 olmalı"

# Forwarding durumu:
sysctl net.ipv4.conf.all.forwarding
# Docker çalışıyorsa çıktı: 1 (normal)
```

## IPv6 Kapalıysa

Eğer IPv6 kapalıysa (örn: `sysctl -a | grep ipv6` boş çıkıyorsa), IPv6 ayarları hata verecektir. Bu **normaldir**, görmezden gelin.

---

## 1. Hazırlık ve Envanter 📋

Kernel ayarlarını değiştirmek risklidir. Önce sistemimizde ne var ne yok bakalım.

```bash
# Docker veya Kubernetes var mı?
command -v docker &>/dev/null && echo "⚠️ Docker bulundu: IP Forwarding KAPATILMAMALI!" || echo "✅ Docker yok, Forwarding kapatılabilir."
```

## 2. Mevcut Ayarları Yedekle 💾

Bir şeyler ters giderse geri dönmek için:

```bash
sudo sysctl -a > ~/sysctl-backup-$(date +%Y%m%d).conf
echo "Yedek alındı: Ana dizine kaydedildi."
```

## 3. Geçici Test (Reboot ile Sıfırlanır) 🧪

Ayarları hemen kalıcı yapmayın. Önce geçici olarak uygulayıp sunucunun çalışıp çalışmadığını (SSH, Web, Docker) test edin.

```bash
# === AĞ GÜVENLİĞİ ===
sudo sysctl -w net.ipv4.conf.all.rp_filter=1
sudo sysctl -w net.ipv4.conf.default.rp_filter=1
sudo sysctl -w net.ipv4.conf.all.accept_redirects=0
sudo sysctl -w net.ipv4.tcp_syncookies=1

# === KERNEL GÜVENLİĞİ ===
sudo sysctl -w kernel.dmesg_restrict=1
sudo sysctl -w kernel.yama.ptrace_scope=1
sudo sysctl -w fs.suid_dumpable=0
sudo sysctl -w kernel.sysrq=176

echo "✅ Geçici ayarlar uygulandı. Şimdi SSH ve servisleri test edin!"
```

> **Sorun Çıktı mı?** Sunucuyu yeniden başlatın (`reboot`). Her şey eski haline döner.

## 4. Kalıcı Uygulama (Scenario Seçimi) 🚀

Testler başarılıysa ayarları kalıcı yapalım. Durumunuza uygun profili seçin:

=== "🅰️ Senaryo A: Sade Sunucu (Docker YOK)"

    Docker, Kubernetes veya VPN **KULLANMIYORSANIZ** bu en güvenli profildir. `IP Forwarding` kapatılır.

    ```bash
    sudo tee /etc/sysctl.d/99-hardening.conf << 'EOF'
    # ==============================================
    # NETWORK SAFETY - SADE SUNUCU (NO DOCKER)
    # ==============================================

    # IP Forwarding KAPAT (Docker yoksa güvenli)
    net.ipv4.conf.all.forwarding = 0
    net.ipv6.conf.all.forwarding = 0

    # IP Spoofing & Source Routing
    net.ipv4.conf.all.rp_filter = 1
    net.ipv4.conf.default.rp_filter = 1
    net.ipv4.conf.all.accept_source_route = 0
    net.ipv4.conf.default.accept_source_route = 0

    # ICMP Redirect Kapat
    net.ipv4.conf.all.accept_redirects = 0
    net.ipv4.conf.default.accept_redirects = 0
    net.ipv4.conf.all.secure_redirects = 0
    net.ipv4.conf.default.secure_redirects = 0

    # TCP SYN Flood & Keepalive
    net.ipv4.tcp_syncookies = 1
    net.ipv4.tcp_max_syn_backlog = 2048
    net.ipv4.tcp_synack_retries = 2
    net.ipv4.tcp_keepalive_time = 600

    # ICMP Rate Limiting
    net.ipv4.icmp_ratelimit = 100

    # ==============================================
    # KERNEL SAFETY
    # ==============================================
    kernel.dmesg_restrict = 1
    kernel.yama.ptrace_scope = 1
    fs.suid_dumpable = 0
    kernel.kptr_restrict = 2
    kernel.sysrq = 176
    dev.tty.ldisc_autoload = 0
    net.core.bpf_jit_harden = 2
    kernel.unprivileged_bpf_disabled = 1
    kernel.perf_event_paranoid = 3
    EOF
    ```

=== "🅱️ Senaryo B: Docker/Kubernetes Sunucusu"

    Docker veya Kubernetes **KULLANIYORSANIZ** bu profili kullanın. `IP Forwarding` açık bırakılır.

    ```bash
    sudo tee /etc/sysctl.d/99-hardening.conf << 'EOF'
    # ==============================================
    # NETWORK SAFETY - DOCKER/K8S PROFİLİ
    # ==============================================

    # ⚠️ IP Forwarding AÇIK KALMALI (Yoksa Container'lar bozulur!)
    # net.ipv4.conf.all.forwarding = 1

    # IP Spoofing & Source Routing
    net.ipv4.conf.all.rp_filter = 1
    net.ipv4.conf.default.rp_filter = 1
    net.ipv4.conf.all.accept_source_route = 0
    net.ipv4.conf.default.accept_source_route = 0

    # ICMP Redirect Kapat
    net.ipv4.conf.all.accept_redirects = 0
    net.ipv4.conf.default.accept_redirects = 0
    net.ipv4.conf.all.secure_redirects = 0
    net.ipv4.conf.default.secure_redirects = 0

    # TCP SYN Flood & Keepalive
    net.ipv4.tcp_syncookies = 1
    net.ipv4.tcp_max_syn_backlog = 2048
    net.ipv4.tcp_synack_retries = 2
    net.ipv4.tcp_keepalive_time = 600

    # ICMP Rate Limiting
    net.ipv4.icmp_ratelimit = 100

    # ==============================================
    # KERNEL SAFETY
    # ==============================================
    kernel.dmesg_restrict = 1
    kernel.yama.ptrace_scope = 1
    fs.suid_dumpable = 0
    kernel.kptr_restrict = 2
    kernel.sysrq = 176
    dev.tty.ldisc_autoload = 0
    net.core.bpf_jit_harden = 2
    kernel.unprivileged_bpf_disabled = 1
    kernel.perf_event_paranoid = 3
    EOF
    ```

## 3. Aktifleştirme

Ayarları sisteme yüklemek için:

```bash
sudo sysctl --system
```

## 4. Doğrulama

Tüm ayarları kontrol et:

```bash
# Tüm hardening ayarlarını göster:
sudo sysctl -a | grep -E "rp_filter|accept_redirects|tcp_syncookies|dmesg_restrict|ptrace_scope"
```

**Beklenen Çıktı (Örnekler):**

```
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.tcp_syncookies = 1
kernel.dmesg_restrict = 1
kernel.yama.ptrace_scope = 1
```

## 5. Sorun Çıkarsa (Geri Alma)

Eğer bu ayarlar uygulamanızı bozarsa (örneğin Kubernetes IP Forwarding ister), dosyayı silip ayarları eski haline getirebilirsiniz.

```bash
# 1. Dosyayı sil
sudo rm /etc/sysctl.d/99-hardening.conf

# 2. Ayarları sıfırla (veya sunucuyu yeniden başlat)
sudo sysctl --system
```
