# Derleyicileri Kısıtlama (Hardening Compilers)

Üretim (Production) sunucularında `gcc`, `make`, `g++` gibi derleyicilerin herkes tarafından ulaşılabilir olması büyük bir güvenlik riskidir.

## 1. Neden Tehlikeli?

Saldırgan sunucuya sızarsa (örneğin bir web açığı ile `www-data` kullanıcısı olsa), sunucudaki kernel sürümüne uygun bir **Exploit** (sömürü kodu) indirip derlemek ister.

### ⚠️ Önemli Uyarı: Bu Bir "Gümüş Kurşun" Değildir!

Derleyicileri kısıtlamak saldırganı tamamen durdurmaz, sadece **yavaşlatır (Speed Bump)**. Saldırgan şunları hala yapabilir:

- Kendi bilgisayarında derlediği hazır binary'i sunucuya yükleyip çalıştırabilir.
- Python, Perl gibi yorumlayıcılarla exploit çalıştırabilir.

Bu yüzden bu işlem daha çok **Lynis/CIS gibi compliance (uyumluluk)** standartları için yapılır.

> **💡 Gerçek Güvenlik Katmanları (Öncelik Sırası):**
>
> 1.  🔴 **Kernel Güncellemeleri:** Exploit'i anlamsız kılar (En kritik!).
> 2.  🔴 **Auditd + Loglama:** Saldırıyı görmenizi sağlar.
> 3.  🟡 **AppArmor/SELinux:** Gerçek process izolasyonu sağlar.
> 4.  🟡 **Noexec Mount:** `/tmp` dizininde çalıştırmayı engeller.
> 5.  🟢 **Derleyici Kısıtlama:** Saldırganı biraz uğraştırır.

---

## 2. Yöntem: Grup Tabanlı Kısıtlama (Kapsamlı Script) ✅

Sadece `gcc` kısıtlamak yetmez. `gcc-12` gibi symlink hedefleri ve `ld`, `make`, `as` gibi yardımcı araçlar da kısıtlanmalıdır.

Aşağıdaki scripti `lock_compilers.sh` olarak kaydedip çalıştırın. Bu script:

1.  `compiler` adında grup oluşturur.
2.  Tüm derleyicileri, linker'ları ve debugger'ları bulur.
3.  İzinleri `750` yapar (sadece root ve compiler grubu çalıştırabilir).
4.  Symlink'lerin gösterdiği asıl dosyaları da kısıtlar.

### Script İçeriği

```bash
#!/bin/bash
# compiler_hardening.sh - Daha kapsamlı versiyon

COMPILER_GROUP="compiler"

# 1. Grup oluştur
sudo groupadd -f "$COMPILER_GROUP"
echo "[+] '$COMPILER_GROUP' grubu oluşturuldu/kontrol edildi."

# 2. Kısıtlanacak Temel Binary Listesi
# Önce sabit isimleri ekle
BINARIES=(
    /usr/bin/gcc
    /usr/bin/g++
    /usr/bin/cc /usr/bin/c++
    /usr/bin/make /usr/bin/cmake
    /usr/bin/as /usr/bin/ld /usr/bin/ld.bfd /usr/bin/ld.gold
    /usr/bin/ar /usr/bin/ranlib /usr/bin/nm
    /usr/bin/objcopy /usr/bin/objdump /usr/bin/strip
    /usr/bin/clang /usr/bin/clang++
)

# Versiyonlu binaryleri (gcc-12 gibi) güvenli bir şekilde ekle
for bin in /usr/bin/gcc-* /usr/bin/g++-* /usr/bin/clang-* 2>/dev/null; do
    [ -e "$bin" ] && BINARIES+=("$bin")
done

# 3. Binary'leri Kısıtla
for bin in "${BINARIES[@]}"; do
    if [ -e "$bin" ] && [ ! -L "$bin" ]; then
        sudo chgrp "$COMPILER_GROUP" "$bin"
        sudo chmod 750 "$bin"
        echo "[+] Kısıtlandı: $bin"
    fi
done

# 4. Symlink Hedeflerini Kısıtla (Örn: gcc -> gcc-12)
for bin in /usr/bin/gcc /usr/bin/g++ /usr/bin/cc; do
    if [ -L "$bin" ]; then
        target=$(readlink -f "$bin")
        if [ -e "$target" ]; then
            sudo chgrp "$COMPILER_GROUP" "$target"
            sudo chmod 750 "$target"
            echo "[+] Symlink hedefi kısıtlandı: $target"
        fi
    fi
done

echo ""
echo "[!] Manuel kontrol önerisi:"
echo "    which -a gcc    # Başka PATH'te gcc var mı?"
echo "    ls /usr/local/bin/gcc* 2>/dev/null"
echo ""
echo "✅ İşlem tamamlandı. Artık sadece 'root' ve 'compiler' grubu derleme yapabilir."
```

### Scripti Çalıştırma

```bash
sudo chmod +x lock_compilers.sh
sudo ./lock_compilers.sh
```

### Yetkili Kullanıcı Ekleme

Eğer bir kullanıcının (veya CI/CD agent'ın) derleme yapması gerekirse:

```bash
sudo usermod -aG compiler $USER
# Değişikliğin aktif olması için logout/login yapın
```

---

## 3. Doğrulama

Normal bir kullanıcı (gruba dahil olmayan) ile deneyelim:

```bash
# root olmayan, gruba eklenmemiş bir kullanıcıya geç (örn: nobody)
su -s /bin/bash nobody

# Çalıştırmayı dene
gcc --version
# Beklenen Hata: "Permission denied" veya "Erişim engellendi"

# Linker dene
ld --version
# Beklenen Hata: "Permission denied"

exit
```

**Sonuç:** Saldırgan artık sunucu üzerinde rahatça "make", "gcc" diyemeyecek. Kernel exploit derlemek için kendi makinesinde cross-compile yapıp taşıması gerekecek (bu da size zaman kazandırır).

## 4. Geri Alma (Rollback) 🔄

Eğer bu kısıtlamalar bir soruna yol açarsa, şu komutlarla her şeyi eski haline getirebilirsiniz:

```bash
# Kritik araçların izinlerini düzelt (755 herkese açık)
sudo chmod 755 /usr/bin/gcc* /usr/bin/g++* /usr/bin/make* /usr/bin/cc* /usr/bin/as* /usr/bin/ld*

# Sahipliği root grubuna geri ver
sudo chgrp root /usr/bin/gcc* /usr/bin/g++* /usr/bin/make* /usr/bin/cc* /usr/bin/as* /usr/bin/ld*
```
