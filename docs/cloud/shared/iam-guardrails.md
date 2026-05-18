# IAM Guardrails

IAM tarafında amaç "birisi girsin" değil, **hangi identity'nin neyi yapabildiğini netleştirmek** olmalıdır. Küçük production sistemlerde en büyük risk çoğu zaman cloud'u hack'lemek değil, fazla yetkili ve izlenmeyen erişim modelidir.

## 1. Identity Modeli

Basit ve güvenli model:

- **Root / Owner:** Sadece emergency ve billing yönetimi için
- **Human admin:** Gerçek kişiler için ayrı kimlik
- **Service identity:** Uygulama veya otomasyon için ayrı kimlik
- **Workload identity:** VM, pod veya job için kısa ömürlü erişim

### Altın Kurallar

- Aynı kimliği birden fazla kişi kullanmamalı
- İnsan ve servis rolleri karıştırılmamalı
- Uzun ömürlü access key'ler varsayılan çözüm olmamalı
- Production yetkisi, staging yetkisinden bağımsız düşünülmeli

## 2. Least Privilege Ne Demek?

Least privilege, kullanıcıya "tahminen lazım olur" diye yetki vermemek demektir.

Önerilen yaklaşım:

1. Önce read-only ile başla
2. Sonra sadece gerekli write action'ları ekle
3. Scope'u servis, region, project veya resource bazında daralt
4. Geniş yetki gerekiyorsa süreli ve gerekçeli ver

Örnek yetki ayrımı:

| Kimlik | Beklenen Yetki |
| :----- | :------------- |
| İnsan admin | Console okuma, sınırlı resource yönetimi, gerektiğinde break-glass |
| CI/CD service account | Sadece deploy, image pull, secret read, rollout |
| Backup bot | Sadece backup hedefine yazma ve restore testi için sınırlı okuma |
| Monitoring agent | Yalnızca metrik veya log push yetkisi |

## 3. Root ve Break-Glass

Root hesabı günlük kullanım için değildir.

Root için minimum standart:

- MFA açık olmalı
- access key kullanılmamalı
- e-posta ve kurtarma seçenekleri kontrol edilmeli
- login geçmişi düzenli gözden geçirilmeli

Break-glass kimliği için:

- ayrı parola / key policy
- vault'ta saklama
- kullanım sonrası rotate
- kim, ne zaman, neden erişti kaydı

## 4. İnsan ve Servis Kimliklerini Ayır

İnsan kimlikleri:

- IAM user
- SSO identity
- federated identity

Servis kimlikleri:

- instance role
- workload identity
- service account
- limited API credential

Karıştırılmaması gerekenler:

- İnsan kullanıcısı ile VM'nin erişim anahtarı aynı olmamalı
- Backup scripti ile operatörün hesabı aynı olmamalı
- Prod ve staging için aynı credential kullanılmamalı

## 5. API Key / Access Key Kuralları

Uzun ömürlü key gerekiyorsa:

- sadece servis hesabında olsun
- kapsamı sınırlı olsun
- rotation tarihi olsun
- secret manager'da saklansın
- local developer machine üzerinde yaşamamalı

İyi pratik:

- yeni key oluştur
- consumer'ı yeni key'e geçir
- eski key'i revoke et
- key'in nerede kullanıldığını belgeye yaz

## 6. Console'da Kontrol Edilecekler

Bu maddeler çoğu zaman console üzerinden doğrulanır:

- MFA açık mı
- root / owner access key var mı
- hangi kullanıcılar admin grubunda
- hangi servis hesapları aktif
- inactive user'lar kapatılmış mı
- key age ve rotation policy uygulanmış mı

## 7. Local Kontroller

Cloud provider'a girmeden önce local ortamda şu kontrolleri yapın:

```bash
rg -n "AKIA|BEGIN .* PRIVATE KEY|secret|token|password" ~/.aws ~/.oci ~/.config/gcloud ~/.ssh 2>/dev/null
stat -c '%a %U %G %n' ~/.ssh/id_* 2>/dev/null
find ~/.config -maxdepth 3 -type f \( -name 'config' -o -name 'credentials' -o -name '*.json' \) 2>/dev/null | head
```

Beklenen:

- private key'ler world-readable olmamalı
- access key'ler düz metin dosyalarda gereksiz yere dağılmamalı
- kullanılan cloud config dosyaları bilinçli olarak yönetilmeli

## 8. Rotation ve Review

Önerilen minimum takvim:

- günlük: yeni yetki verilmiş mi
- haftalık: aktif servis kimlikleri gözden geçirildi mi
- aylık: admin listesi ve key age kontrol edildi mi
- çeyreklik: break-glass testi yapıldı mı

## 9. Verify Matrix

| Kontrol | Komut / İşlem | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| Root hesabı kontrolü | Console | Root üzerinde MFA açık olmalı, key olmamalı |
| Admin ayrımı | Console | İnsan hesapları ile servis hesapları ayrı olmalı |
| Local secret sızıntı taraması | `rg -n "AKIA|BEGIN .* PRIVATE KEY|secret|token|password" ~/.aws ~/.oci ~/.config/gcloud ~/.ssh 2>/dev/null` | Beklenmeyen secret görünmemeli |
| SSH key izinleri | `stat -c '%a %U %G %n' ~/.ssh/id_* 2>/dev/null` | Key dosyaları sıkı izinli olmalı |
| Cloud config izi | `find ~/.config -maxdepth 3 -type f \( -name 'config' -o -name 'credentials' -o -name '*.json' \)` | Hangi kimlik dosyalarının kullanıldığı bilinmeli |

## 10. No-Go Durumları

Şu durumda IAM tasarımını production-ready saymayın:

- root üzerinde MFA kapalıysa
- servis ve insan kimliği aynı hesabı kullanıyorsa
- credential rotation planı yoksa
- admin yetkisi "geçici" verilip sonra kaldırılmıyorsa
- console ve local audit izi birlikte incelenmiyorsa
