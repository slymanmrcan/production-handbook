# Cost Guardrails

Cloud faturası çoğu zaman tek bir büyük hata yüzünden değil, küçük unutulan kaynaklar yüzünden büyür. Bu sayfa provider-agnostic maliyet kontrolü içindir.

## 1. Temel Politika

Kurallar:

- Budget olmadan production açma
- Quota olmadan test ortamı büyütme
- Kullanılmayan resource'ları düzenli temizle
- Snapshot ve backup retention'ı tanımla
- Static IP, disk ve volume orphan kontrolü yap

## 2. Budget ve Alarm

Budget kontrolü çoğu provider'da console üzerinden yapılır.

Önerilen alarm basamakları:

- %50: bilgi
- %80: inceleme
- %100: acil durdurma / onay gerektirir

Console'da şu sorulara cevap arayın:

- budget hangi project/account için tanımlı
- alarm kime gidiyor
- aylık mı günlük mü takip ediliyor
- notify channel test edildi mi

## 3. Quota ve Limit

Quota yoksa yanlışlıkla resource şişirmesi kolaylaşır.

Kontrol edilmesi gereken limitler:

- instance sayısı
- public IP sayısı
- disk/volume sayısı
- snapshot sayısı
- load balancer sayısı
- CPU / RAM sınırlamaları

Bir sistemde quota görünmüyorsa, bu da risk demektir. Konsolda manuel kontrol zorunludur.

## 4. Shutdown Policies

Prod olmayan ortamlar için maliyet azaltmanın en etkili yolu, kullanılmadığında kapatmaktır.

Öneriler:

- dev / sandbox VM'leri mesai dışı kapat
- test database'leri haftasonu kapalı tut
- çalışan ama kullanılmayan bastion'ları gözden geçir
- otomatik aç/kapa saatleri belirle

Console veya automation ile yapılacak kontrol:

- kim kapatıyor
- hangi tag ile kapatılıyor
- yeniden açma prosedürü ne

Host tarafında doğrulama:

```bash
uptime
systemctl status <service> --no-pager
docker ps
```

Ama asıl "shutdown policy" console veya scheduler tarafındadır.

## 5. Snapshot ve Backup Hygiene

Snapshot, backup ve image çoğu zaman birikir.

Retention önerisi:

- günlük: kısa süreli
- haftalık: orta süreli
- aylık: arşiv

Kurallar:

- Her snapshot'ın amacı yazılı olmalı
- Test restore'u olmayan snapshot'a güvenmeyin
- Label/tag olmayan snapshot bir süre sonra çöplüğe döner

Console'da kontrol edin:

- son snapshot tarihi
- snapshot owner
- hangi disk/instance'tan geldiği
- delete policy

## 6. Orphan Check

En pahalı sessiz hatalar:

- unattached public IP
- detached block disk / EBS / persistent disk
- unutulmuş snapshot
- kullanılmayan load balancer
- boşta duran NAT / gateway / firewall rule

Orphan kontrolü için:

1. Terminated instance sonrası bağlı kaynakları listele
2. Detached disk veya snapshot kaldı mı bak
3. Public IP boştaysa geri ver
4. Artık kullanılmayan test network'ünü sil

Repo/IaC tarafında hızlı arama:

```bash
rg -n "public.?ip|reserved|elastic|floating|snapshot|volume|disk|nat|gateway" . --glob '!site/**'
```

## 7. Host Tarafı Maliyet Sızıntısı

Cloud faturası kadar host üzerinde de gereksiz tüketim olur:

- aşırı büyümüş docker image cache
- sınırsız log
- büyüyen journal
- eski backup dosyaları
- gereksiz apt cache

Kontrol komutları:

```bash
df -h
du -sh /var/lib/docker 2>/dev/null
docker system df
journalctl --disk-usage
```

Temizlik planı varsa verify edin:

```bash
docker image prune --filter "until=168h"
journalctl --vacuum-time=7d
apt clean
```

## 8. Console Checkleri

Şu maddeler mutlaka console üzerinden kontrol edilmelidir:

- budget alarmı var mı
- quota doluyor mu
- unattached IP var mı
- detached disk var mı
- snapshot retention çalışıyor mu
- shutdown schedule aktif mi

## 9. Verify Matrix

| Kontrol | Komut / İşlem | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| Host disk | `df -h` | Beklenmeyen doluluk olmamalı |
| Docker cache | `docker system df` | İmaj ve cache büyümesi kontrol altında olmalı |
| Journal boyutu | `journalctl --disk-usage` | Loglar sınırsız büyümemeli |
| Orphan kaynak taraması | `rg -n "public.?ip|reserved|elastic|floating|snapshot|volume|disk|nat|gateway" . --glob '!site/**'` | IaC / repo içinde eski referanslar bulunmalı |
| Budget / quota | Console | Budget ve quota alarmı aktif olmalı |

## 10. No-Go Durumları

Şu durumlarda maliyet guardrail'ini yeterli saymayın:

- budget alarmı yoksa
- orphan public IP ve disk temizliği yapılmıyorsa
- snapshot retention tanımsızsa
- test ortamı kapatma politikası yoksa
- host logları ve docker cache düzenli kontrol edilmiyorsa
