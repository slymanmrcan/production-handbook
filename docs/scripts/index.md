# Script Repository & Otomasyon Standardı

Bu bölüm, sunucuda çalışan Bash scriptlerin ve onlara ait markdown dokümanların nasıl tasarlanacağını, nasıl test edileceğini ve nasıl production'a taşınacağını tarif eder.

## Rol

`docs/scripts/library/*.md` sayfaları executable script değildir. Bunlar:

- operasyon standardını yazar
- komut akışını tek yerde toplar
- güvenlik ve idempotency kararlarını netleştirir
- gerçek `*.sh` dosyasına geçmeden önce gözden geçirme alanı sağlar

Gerçek çalışma zamanı scripti, dağıtımdan sonra `/usr/local/bin` altında yaşar. Markdown sayfası ise o scriptin davranış sözleşmesidir.

## Yaşam Döngüsü

1. Önce davranışı `conventions.md` ile tanımla.
2. Çalıştırma modelini `execution.md` ile seç.
3. Riskleri `safety.md` ile kapat.
4. Library sayfasındaki örneği gerçek `*.sh` dosyasına dönüştür.
5. `bash -n` ve `shellcheck` ile doğrula.
6. Staging veya tek amaçlı test hostunda çalıştır.
7. Sonra `/usr/local/bin` altına kur ve systemd timer veya service ile bağla.

## Markdown'dan Gerçek Script'e Geçiş

Bir library sayfası hazır olduğunda pratik akış şu olmalı:

```bash
install -d /usr/local/bin
install -m 0755 backup-db.sh /usr/local/bin/backup-db.sh
bash -n /usr/local/bin/backup-db.sh
shellcheck /usr/local/bin/backup-db.sh
/usr/local/bin/backup-db.sh
```

Buradaki amaç sadece dosyayı kopyalamak değil, aynı davranışı tekrar üretilebilir hale getirmektir. Script bir kez elle çalışıyorsa bu yeterli değildir; log, exit code, cleanup ve yeniden çalıştırma davranışı da doğrulanmalıdır.

## Hangi Sayfa Ne İçin

- [Script Yazım Standartları](conventions.md): strict mode, naming, logging, hata yönetimi
- [Script Çalıştırma Standartları](execution.md): foreground/background modeli, systemd service/timer, log davranışı
- [Script Güvenliği](safety.md): secrets, indirilen scriptler, privilege sınırları, tehlikeli pattern'ler
- [Otomasyon Rehberi](automation.md): daha geniş otomasyon ve dağıtım düşüncesi

## Production Kuralı

Production'a çıkmadan önce şu sorular net olmalı:

- Script root gerektiriyor mu, gerektiriyorsa neden?
- Hangi log hedefini kullanıyor?
- Hangi durumda fail etmeli?
- Aynı input ile yeniden çalıştırıldığında aynı sonucu veriyor mu?
- Cleanup, rollback veya retry davranışı ne?
- Bir hata halinde unit/timer nasıl görünür hale gelecek?

## Hazır Script Hardening Checklist

`docs/scripts/library/*.md` altındaki "ready-to-use" örnekler, sadece çalışan Bash snippet'i olmakla yetinmemeli. Aşağıdaki güvenlik çıtasını karşılamalı:

- destructive adımlarda açık guard veya `--force` freni
- tekrar çalıştırmada duplicate config üretmeyen idempotent akış
- `mktemp`, `trap`, atomic move gibi yarım çıktı korumaları
- secret veya credential'ı log'a basmayan giriş modeli
- `bash -n` ve `shellcheck` ile doğrulanabilir syntax/lint durumu
- staging veya restore testi ile davranışı kanıtlayan verify bölümü

Bir library sayfası bu başlıkları karşılamıyorsa "örnek" olabilir ama henüz "production-ready" sayılmaz.

## Test Sırası

Önerilen test sırası aşağıdadır:

1. `bash -n <script>.sh`
2. `shellcheck <script>.sh`
3. Boş olmayan örnek input ile staging çalıştırması
4. Log ve exit code kontrolü
5. Gerekirse timer/service üzerinden gerçek tetikleme

## Verify Matrix

| Kontrol | Komut / İşlem | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| Script standardı okunmuş mu | `docs/scripts/conventions.md` | Strict mode ve naming modeli net olmalı |
| Çalıştırma modeli seçilmiş mi | `docs/scripts/execution.md` | Timer/service kararı net olmalı |
| Güvenlik modeli belirlenmiş mi | `docs/scripts/safety.md` | Secret ve privilege kuralları tanımlı olmalı |
| ShellCheck taraması yapılmış mı | `shellcheck <script>.sh` | Kritik lint hatası olmamalı |
| Syntax doğrulandı mı | `bash -n <script>.sh` | Bash parse hatası olmamalı |

## Pratik Kural

Bir davranışın tek kaynağı tek yerde yaşamalı:

- runtime davranışı için gerçek `*.sh`
- operasyon standardı için markdown
- daha büyük akışlar için runbook veya how-to sayfası

Aynı komutu hem README'ye hem library sayfasına hem de script içine kopyalamayın. Markdown, operasyonel kararın kaydıdır; script ise çalışan uygulamadır.
