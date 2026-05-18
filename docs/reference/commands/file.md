# Dosya ve Dizin Komutları

Dosya bulma, içerik okuma, izin düzeltme ve arşiv işlemleri için hızlı operatör referansı.

## Hızlı Triyaj

Bir dosya nerede, ne kadar büyük, ne tür, ne zaman değişmiş?

```bash
pwd
ls -lah
find . -maxdepth 2 -type f | head
stat config.yaml
file /path/to/artifact
```

- `find` dar kapsamla başlatılır, sonra genişletilir.
- `stat` izin, sahiplik ve zaman damgalarını görmek için `ls`'den daha nettir.
- `file` uzantıya güvenmek yerine gerçek dosya tipini doğrular.

## Arama ve Tarama

Metin, dosya adı veya boyuta göre inceleme için kullan.

```bash
# Hızlı metin arama
rg -n "error|failed|panic" /var/log

# grep fallback
grep -RIn "error" /var/log

# İsme göre bul
find /var -xdev -name "*.log"

# Son 24 saatte değişenler
find /etc -xdev -mtime -1

# Büyük dosyalar
find /var -xdev -type f -size +100M
```

- `rg` varsa tercih et, yoksa `grep -RIn` kullan.
- `-xdev` ile mount sınırlarını geçme; yanlışlıkla tüm sistemi gezme.
- `find /` yerine önce uygulama veya servis dizininden başla.

## Okuma ve İzleme

Log, konfigürasyon ve çıktı dosyalarını güvenli biçimde oku.

```bash
head -n 20 app.conf
tail -n 100 app.log
tail -F app.log
less -R /var/log/syslog
sed -n '1,120p' nginx.conf
wc -l app.log
```

- `tail -F` log rotate olsa bile izlemeye devam eder.
- `less` büyük dosyada `cat`'ten daha güvenlidir; RAM'i şişirmez.
- `sed -n` ile belirli satır aralığını oku, tüm dosyayı basma.

## Yetki ve Sahiplik

İzinleri düzeltmek için kullan, ama önce hedefi doğrula.

```bash
chmod +x script.sh
chmod 600 ~/.ssh/id_rsa
chmod 640 /etc/myapp/config.yml
chmod 755 /opt/myapp/bin

chown -R www-data:www-data /var/www/html
chgrp -R adm /var/log/myapp
```

- Gizli anahtarlar için `600`, servis konfigleri için çoğu zaman `640` yeterlidir.
- `-R` kullanmadan önce yolun doğru olduğundan emin ol.
- `chmod 777` genelde yanlış çözümdür; izin probleminden çok güvenlik problemi yaratır.

## Arşiv ve Paketleme

Yedek alma, taşıma ve inceleme için.

```bash
tar -czf backup.tar.gz /var/www
tar -tzf backup.tar.gz
tar -xzf backup.tar.gz

gzip app.log
gunzip app.log.gz

unzip archive.zip
```

- Arşivi açmadan önce `tar -tzf` ile içeriğini listele.
- `tar` ile tam yol verirken hedef klasörü doğru seç; yanlış kökte çalıştırma.

## Doğrulama

Değişiklikten sonra hızlı kontrol:

```bash
ls -l
stat config.yml
file config.yml
sha256sum artifact.bin
tar -tzf backup.tar.gz | head
```

## Yüksek Riskli Komutlar

Bu komutları körlemesine çalıştırma:

```bash
rm -rf /path/to/dir
find / -name "*.tmp" -delete
chmod -R 777 /path
chown -R root:root /
sed -i 's/foo/bar/g' /etc/important.conf
```

- `rm -rf` ve `find -delete` geri dönüşü zor hasar bırakır.
- `sed -i` ile tek satır yerine yanlış dosya üzerinde toplu değişiklik yapmak kolaydır.
- `chown -R` köke yakın dizinlerde çok dikkatli kullanılmalıdır.
