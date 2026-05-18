# Swap Bellek Oluşturma

Swap, RAM dolduğunda sistemin disk üzerinde kullandığı "yedek bellek" alanıdır. Özellikle düşük RAM'li sunucularda (1-2GB) hayat kurtarır.

## Ne Zaman Gerekir?

- **RAM < 2GB**: Mutlaka swap oluşturun.
- **RAM 2-4GB**: Önerilir (Özellikle veritabanı çalıştırıyorsanız).
- **RAM > 8GB**: Genellikle gerekli değil ama hibernation için kullanılabilir.

## Swap Boyutu

Genel kural:

- RAM ≤ 2GB → Swap = RAM x 2
- RAM > 2GB → Swap = RAM (veya biraz daha az)

## Oluşturma Adımları

### 1. Mevcut Swap Kontrolü

```bash
free -h
# Swap satırı 0 ise swap yok demektir
```

### 2. Swap Dosyası Oluştur

2GB swap için:

```bash
# 2GB'lık boş dosya oluştur (Bu işlem biraz sürebilir)
sudo fallocate -l 2G /swapfile

# Alternatif (fallocate yoksa):
# sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
```

### 3. İzinleri Ayarla

Swap dosyası sadece root tarafından okunabilir olmalı (güvenlik):

```bash
sudo chmod 600 /swapfile
```

### 4. Swap Alanı Olarak İşaretle

```bash
sudo mkswap /swapfile
```

### 5. Aktifleştir

```bash
sudo swapon /swapfile
```

Kontrol:

```bash
free -h
# Artık Swap satırında 2GB görmelisiniz
```

### 6. Kalıcı Hale Getir

Sunucu yeniden başladığında swap otomatik aktif olsun:

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Swappiness Ayarı (Opsiyonel)

`swappiness`, sistemin ne kadar agresif swap kullanacağını belirler (0-100).

- **0**: Sadece RAM tamamen dolduğunda swap kullan.
- **60**: Varsayılan (Biraz erken swap kullanmaya başlar).
- **100**: Her fırsatta swap kullan (Önerilmez).

Sunucular için **10** değeri idealdir:

```bash
# Geçici (Reboot sonrası sıfırlanır)
sudo sysctl vm.swappiness=10

# Kalıcı
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

## Swap Silme (İhtiyaç Kalmadıysa)

```bash
sudo swapoff /swapfile
sudo rm /swapfile
# /etc/fstab'dan ilgili satırı manuel silin
```
