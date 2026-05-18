# Script Güvenliği

Script, doğru tasarlanmadığında güvenlik açığını otomasyona dönüştürür. Bu bölümün amacı işi yavaşlatmak değil, geri dönüşsüz hataları engellemektir.

## 1. Secret Yönetimi

Secret'i script içine gömmeyin.

Kaçın:

```bash
DB_PASSWORD="cokgizlisifre"
API_TOKEN="..."
```

Tercih et:

- environment variable
- repo dışında kalan `.env`
- dedicated secret file
- cloud secret manager veya parameter store

Kontrol akışı:

```bash
test -f .env && source .env
printf '%s\n' "${DB_PASSWORD:-missing}"
```

Not:

- `.env` dosyasını log'a basma
- backup setine yanlışlıkla dahil etme
- image içine kopyalama
- `set -x` açıkken secret çalıştırma

## 2. İndirilen Scriptler

`curl | bash` production standardı değildir.

Kötü örnek:

```bash
curl https://site/setup.sh | bash
```

Güvenli akış:

1. indir
2. incele
3. checksum veya imza doğrula
4. çalıştır

```bash
curl -fsSLO https://site/setup.sh
sed -n '1,120p' setup.sh
sha256sum setup.sh
bash setup.sh
```

Eğer yayıncı imza veriyorsa `gpg --verify` kullan. İndirme bitmeden çalıştırma. İçeriği görmeden prod host'ta tetikleme.

## 3. Geçici Dosyalar ve Cleanup

Destructive işlem yapıyorsan temp file kullan ve cleanup'i garanti altına al.

```bash
tmp_file="$(mktemp "${TMPDIR:-/tmp}/backup.XXXXXX")"
trap 'rm -f "$tmp_file"' EXIT
```

Bu yaklaşım, yarım kalan çıktının hedef dosyayı bozmasını engeller.

## 4. Yetki Sınırı

Root yalnızca gerçekten gerekliyse kullanılmalı. Script'in tamamını root yerine sadece gereken komutu `sudo` ile yükseltmek daha doğrudur.

Kontrol:

```bash
if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "root gerekli"
  exit 1
fi
```

Root gerekmiyorsa dedicated kullanıcı ile çalış.

## 5. Input ve Path Güvenliği

Kullanıcı girdisi, environment ve path her zaman quote edilmeli. Destructive komutlarda ekstra guard kullan.

Yanlış:

```bash
rm -rf $DIR
```

Doğru:

```bash
rm -rf -- "$DIR"
```

En azından şu kuralları uygula:

- allowlist kullan
- regex ile doğrula
- boş değerleri fail say
- `eval` kullanma
- `ls` çıktısını parse ederek karar verme

## 6. Konfigürasyon Yazma ve Idempotency

`/etc/ssh/sshd_config`, `/etc/fstab`, `/etc/sysctl.conf` gibi dosyalara kör `>>` append etmek, script ikinci kez çalıştığında duplicate satır üretir.

Kaçın:

```bash
echo "vm.swappiness=10" >> /etc/sysctl.conf
```

Tercih et:

- drop-in dosyası kullan (`/etc/ssh/sshd_config.d/*.conf`, `/etc/sysctl.d/*.conf`)
- tek sorumluluğu olan yönetilen blok yaz
- aynı satır zaten varsa append etme

Kontrol:

```bash
grep -R "^vm.swappiness=10$" /etc/sysctl.conf /etc/sysctl.d 2>/dev/null
```

## 7. Riskli Pattern'ler

| Pattern | Risk | Yapılacak |
| :------ | :--- | :-------- |
| `rm -rf` | Geri dönüşsüz silme | Önce path ve glob doğrula |
| `chmod 777` | Gereksiz geniş yetki | En az yetki ver |
| `chown -R` | Büyük dizinde yıkıcı olabilir | Hedefi daralt |
| `docker system prune -a` | Image kaybı | Bilinçli bakımda ve timer ile kullan |
| `journalctl --vacuum-time=1s` | Aşırı agresif log temizliği | Retention politikası ile uygula |
| `set -x` | Secret sızıntısı | Debug modunda kapalı tut |
| `>> /etc/*.conf` | Duplicate config ve drift | Drop-in veya yönetilen blok kullan |

## 8. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Secret leak var mı | `rg -n '(password|token|secret|key)' .` | Hardcoded secret olmamalı |
| Syntax kontrolü | `bash -n <script>.sh` | Parse hatası olmamalı |
| Lint kontrolü | `shellcheck <script>.sh` | Kritik hata olmamalı |
| Root gerekliliği doğru mu | Script başındaki EUID kontrolü | Gereksiz root kullanımı olmamalı |
| İndirme akışı güvenli mi | `sed -n '1,120p' setup.sh` | Çalıştırmadan önce içerik okunmalı |
| Config yazımı idempotent mi | `grep -R 'managed by' /etc/*.d /etc 2>/dev/null` | Aynı ayar tekrar append edilmemeli |
