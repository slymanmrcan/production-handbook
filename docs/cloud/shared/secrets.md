# Secrets Guardrails

Secret yönetimi, cloud guardrail'lerinin en kritik parçasıdır. Secret'leri düzgün yönetmiyorsanız IAM veya network ne kadar iyi olursa olsun incident çıkacaktır.

## 1. Secret Nedir?

Bu kapsamda secret sayılan her şey:

- database password
- API token
- SSH private key
- TLS private key
- signing key
- webhook secret
- cloud access key

## 2. Temel Prensipler

### Secret'i Git'e Koyma

Git repository içinde secret yaşamamalı:

- `.env`
- JSON credential dosyası
- private key
- backup içinde düz metin parola

### Secret'i Image'a Gömme

AMI, container image veya golden image içine production secret gömmek geri dönüşü zor bir hatadır.

### Secret'i Tek Yerde Tut

Source of truth tek olmalı:

- secret manager
- vault
- KMS destekli encrypted store

Yedek saklama ile üretim secret saklama aynı şey değildir.

## 3. Injection Pattern'leri

Tercih sırası:

1. Secret manager -> runtime fetch
2. Mount edilen secret file
3. Environment variable

Env var yalnızca kısa ömürlü veya low-risk değerler için kabul edilebilir. Gerçek secret için file mount veya secret manager daha güvenlidir.

### File Tabanlı Örnek

```bash
install -d -m 0700 /etc/myapp
install -m 0400 /dev/null /etc/myapp/db-password
```

Dosya okunacak kullanıcıya göre izin verin:

```bash
chown root:root /etc/myapp/db-password
chmod 0400 /etc/myapp/db-password
```

Systemd kullanan servislerde:

```ini
[Service]
EnvironmentFile=/etc/myapp/app.env
```

Bu dosya `0600` olmalı ve repoya girmemelidir.

### Docker / Compose Notu

Secret'i image build arg ile taşımayın. Runtime mount tercih edin.

## 4. Rotasyon Politikası

Secret rotasyonu şu durumlarda zorunlu olmalı:

- çalışan biri ayrıldıysa
- secret sızdıysa
- staging secret yanlışlıkla prod'a taşındıysa
- key age policy dolduysa
- üçüncü taraf servis credential formatını değiştirdiyse

Rotasyon sırası:

1. Yeni secret üret
2. Consumer'ları yeni secret'e geçir
3. Eski secret'i revoke et
4. Log ve backup içinde eski secret izi var mı kontrol et

## 5. Backup ve Secret

Backup ile birlikte secret taşıma dikkat ister.

Kurallar:

- backup içinde plain text secret varsa buna "veri" değil "risk" gözüyle bakın
- restore testinde secret'lerin doğru erişim modeliyle geldiğini doğrulayın
- off-site backup da secret governance kapsamındadır

## 6. Repo ve Shell Hygiene

Kontrol edilecekler:

- `git status` temiz mi
- shell history'de secret komutu var mı
- env dosyaları veya credential dosyaları yanlış yerde mi
- CI log'larında secret sızıntısı var mı

Komutlar:

```bash
rg -n "password|secret|token|apikey|private_key|BEGIN .* PRIVATE KEY" . --glob '!site/**'
history | tail -n 50
find . -maxdepth 3 \( -name '.env' -o -name '*.pem' -o -name '*.key' -o -name 'credentials' \)
```

## 7. File Permission Baseline

Minimum baseline:

- secret file: `0400` veya `0600`
- secret directory: `0700`
- owner: uygulama user'ı veya root, bilinçli olarak
- world-readable: hayır

Kontrol:

```bash
stat -c '%a %U %G %n' /etc/myapp/* 2>/dev/null
find /run/secrets -maxdepth 1 -type f -exec stat -c '%a %U %G %n' {} \;
```

## 8. Console Checkleri

Cloud console veya secret manager içinde şu kontroller gerekir:

- secret versioning aktif mi
- eski version revoke edilmiş mi
- access policy sadece gerekli principal'lara mı açık
- audit log saklanıyor mu
- manuel export/download kapalı mı veya kısıtlı mı

## 9. Verify Matrix

| Kontrol | Komut / İşlem | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| Repo'da secret taraması | `rg -n "password|secret|token|apikey|private_key|BEGIN .* PRIVATE KEY" . --glob '!site/**'` | Beklenmeyen secret görünmemeli |
| Shell history kontrolü | `history | tail -n 50` | Hassas komutlar history'de olmamalı |
| Secret dosya izinleri | `stat -c '%a %U %G %n' /etc/myapp/* 2>/dev/null` | 0400/0600 ve doğru owner görünmeli |
| Runtime secret mount | `find /run/secrets -maxdepth 1 -type f -exec stat -c '%a %U %G %n' {} \;` | Secret mount'lar sıkı izinli olmalı |
| Cloud secret policy | Console | Versioning, revoke ve audit log açık olmalı |

## 10. No-Go Durumları

Şunlar varsa production saymayın:

- secret'ler image içinde ise
- `.env` dosyası repo'ya düşüyorsa
- birden fazla ortam aynı secret'ı paylaşıyorsa
- shell history ve CI log'ları taranmıyorsa
- secret manager yerine "nasıl olsa kimse görmez" yaklaşımı kullanılıyorsa
