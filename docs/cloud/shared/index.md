# Cloud Guardrails

Bu alan provider-agnostic guardrail'leri toplar. AWS, Oracle veya Google Cloud fark etmeksizin aynı sorunlar tekrar eder:

- kimlikler karışır
- secret'ler dağılır
- maliyet görünmez hale gelir
- unutulan volume, snapshot veya public IP kaynak sızıntısı üretir

Buradaki hedef, Linux server odaklı küçük ve orta ölçekli production kurulumlarda temel kontrol katmanını standartlaştırmaktır.

## Ne Zaman Kullanılır?

Bu bölüm şuralarda referans alınmalıdır:

- yeni bir cloud account / project açarken
- production ile staging'i ayırırken
- CLI erişimi verirken
- secret injection tasarlarken
- bütçe, quota ve orphan resource kontrolü yaparken

## Guardrail Kategorileri

| Kategori | Ne Korur | Rehber |
| :------ | :------- | :----- |
| Identity | Yanlış kişinin fazla yetki almasını | [IAM Guardrails](iam-guardrails.md) |
| Secrets | Parola, token, key ve sertifika sızıntısını | [Secrets](secrets.md) |
| Cost | Sessiz faturayı, unutilized resource'ları ve runaway growth'u | [Cost Guardrails](cost-guardrails.md) |

## Varsayılan Tavsiye

Minimal production standard:

1. Her insan için ayrı hesap veya SSO kimliği kullanın.
2. Servis hesaplarını insan hesaplarından ayırın.
3. Secret'leri git'e, image'a, shell history'ye veya plain text notlara koymayın.
4. Budget ve quota alarmı olmadan production başlatmayın.
5. Kullanılmayan IP, disk ve snapshot'ları düzenli temizleyin.

## Hızlı Başlangıç

- [IAM Guardrails](iam-guardrails.md)
- [Secrets](secrets.md)
- [Cost Guardrails](cost-guardrails.md)

## Verify Matrix

| Kontrol | Komut / İşlem | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| Shared guardrail alanı hazırlanmış mı | `ls docs/cloud/shared` | `index.md`, `iam-guardrails.md`, `secrets.md`, `cost-guardrails.md` görünmeli |
| Guardrail ilkeleri okunmuş mu | İlgili dokümanlar | IAM, secret ve cost kontrol modeli net olmalı |
| Console kontrol listesi var mı | Doküman içi kontrol listeleri | Budget, MFA ve orphan check'ler için console adımları bulunmalı |

## Not

Bu alan intentionally provider-agnostic tutulur. Provider'a özel teknik detay gerekiyorsa ilgili cloud bölümüne geçin:

- [AWS](../aws/concepts.md)
- [Oracle Cloud](../oracle/overview.md)
- [Google Cloud](../google/overview.md)
