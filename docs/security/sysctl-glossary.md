# Kernel Parametreleri Sözlüğü (Sysctl Reference)

Bu sayfa, `sysctl.conf` dosyasında yaptığımız ayarların teknik detaylarını, neden yapıldığını ve değerlerin (0, 1, 2) ne anlama geldiğini açıklar.

## 🌐 Ağ Güvenliği (Network)

### `net.ipv4.conf.all.rp_filter`

** Reverse Path Filtering (IP Spoofing Koruması)**

- **Amaç:** Sunucuya gelen bir paketin, gerçekten geldiği IP adresinden mi yoksa taklit (spoof) bir adresten mi geldiğini kontrol eder.
- **0:** Kapalı. Kontrol yapmaz.
- **1 (Önerilen/Strict):** Paketin geldiği arayüz, o IP'ye giden rotayla eşleşmelidir. Eşleşmezse paketi çöpe atar.
- **2 (Loose):** Paket herhangi bir arayüzden dönebiliyorsa kabul et. (Asimetrik routing için).

### `net.ipv4.conf.all.accept_redirects`

** ICMP Redirect Kabulü**

- **Amaç:** Router'ların "yolu değiştirdim, paketleri buradan gönder" komutunu kabul edip etmeyeceği.
- **0 (Önerilen):** Reddet. Saldırganlar sizi sahte bir ağ geçidine (Gateway) yönlendirip trafiğinizi dinleyebilir (MITM).
- **1:** Kabul et. (Sadece router olarak çalışan cihazlarda belki gerekebilir).

### `net.ipv4.conf.all.forwarding`

** IP Forwarding (Yönlendirme)**

- **Amaç:** Sunucunun bir "Router" gibi davranıp, bir arayüzden gelen paketi diğerine iletmesi.
- **0 (Sade Sunucu):** Kapat. Biz son durağız, trafik taşımıyoruz.
- **1 (Docker/VPN):** Aç. Docker container'ları internete çıkmak için sunucu üzerinden geçer. Kapatılırsa Docker ağı kopar.

### `net.ipv4.tcp_syncookies`

** SYN Flood Koruması**

- **Amaç:** Sunucuya saniyede binlerce sahte "Merhaba" (SYN) isteği gelirse RAM şişer. Bu ayar, bilgiyi RAM yerine çerezde (Cookie) tutar.
- **0:** Kapalı.
- **1 (Önerilen):** SYN Flood saldırısı algılanırsa devreye girer ve servisin çökmesini engeller.

### `net.ipv4.icmp_ratelimit`

** Ping (ICMP) Hız Sınırlaması**

- **Amaç:** Birisi size "Ping Flood" yaparsa (saniyede 1 milyon ping), işlemci buna cevap vermekten yorulur.
- **Değer (ms):** Belirtilen milisaniyede kaç cevap verileceğini sınırlar. Örneğin `100` yapmak saldırıyı yavaşlatır.

---

## 🛡️ Çekirdek Güvenliği (Kernel)

### `kernel.dmesg_restrict`

** Kernel Loglarını Gizleme**

- **Amaç:** `dmesg` komutu kernel hatalarını ve bellek adreslerini gösterir. Saldırganlar bu adresleri kullanarak exploit (istismar kodu) yazar.
- **0:** Herkes kernel loglarını görebilir.
- **1 (Önerilen):** Sadece `root` veya yetkili kullanıcılar görebilir.

### `kernel.yama.ptrace_scope`

** Süreç İzleme (Ptrace) Kısıtlaması**

- **Amaç:** Bir programın (örn: virüs), çalışan başka bir programın hafızasını okumasını (şifre çalma vb.) engeller.
- **0:** Klasik Linux. Her program kendi yetkisindeki diğer programı izleyebilir.
- **1 (Önerilen):** Sadece "baba" süreçler (parent process) çocuklarını izleyebilir.
- **2 (Admin Only):** Sadece root izleyebilir.
- **3:** Ptrace tamamen iptal (debugging yapılamaz).

### `fs.suid_dumpable`

** Core Dump (Hata Dökümü) Kısıtlaması**

- **Amaç:** `suid` (yetkili) bir program çöktüğünde RAM içeriğini diske yazar mı? Bu dosyada (core dump) root şifreleri bulunabilir.
- **0 (Önerilen):** Hayır, diske yazma (Güvenli).
- **1:** Evet, yaz (Debug için).
- **2:** Güvenli modda yaz (Sadece root okuyabilir).

### `kernel.kptr_restrict`

** Kernel Pointer (Hafıza Adresi) Gizleme**

- **Amaç:** `/proc/kallsyms` dosyasındaki kernel fonksiyon adreslerini gizler. Kernel açığı arayan saldırganı kör eder.
- **0:** Herkes görür.
- **1:** Kernel izin verirse görünür.
- **2 (Önerilen):** Kimse (root dahil) göremez, hepsi `00000000` olarak görünür.

### `kernel.sysrq`

** Magic SysRq Key (Sihirli Kurtarma Tuşu)**

- **Amaç:** Sistem donduğunda klavyeden `Alt + SysRq + B` gibi tuşlarla reboot atabilmek.
- **0 (En Güvenli):** Tamamen kapalı. Fiziksel erişimi olan biri bile tuşlarla sistemi resetleyemez.
- **1:** Tamamen açık.
- **176 (Önerilen):** Sadece kritik kurtarma (Sync, Unmount, Reboot) komutlarına izin ver.

### `dev.tty.ldisc_autoload`

** TTY Line Discipline Loading**

- **Amaç:** Yeni bir TTY modülü yüklemeyi engeller. Geçmişte buradan yetki yükseltme açıkları çıkmıştı.
- **0 (Önerilen):** Otomatik yüklemeyi kapat.
- **1:** Açık.

### `kernel.perf_event_paranoid`

** Performans İzleme Kısıtlaması**

- **Amaç:** İşlemci performans sayaçlarını (Performance Counters) kim kullanabilir? Bu veriler yan kanal (side-channel) saldırılarında kullanılır.
- **-1:** Herkes her şeyi izleyebilir (Güvensiz).
- **2:** Sadece kullanıcı seviyesi işlem.
- **3 (Önerilen):** En sıkı mod. İzlemeyi kapat veya sadece root'a izin ver.

---

## ⚠️ Kritik Uyarılar

- **1 = Açık, 0 = Kapalı** kuralı **her zaman geçerli değildir**.
  - Örneğin: `disable_ipv6 = 1` derseniz IPv6 **kapanır**.
  - Örneğin: `forwarding = 1` derseniz yönlendirme **açılır**.
- Bu yüzden her parametrenin ne işe yaradığını bu sözlükten kontrol etmek önemlidir.
