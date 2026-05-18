# İleri Seviye Güvenlik Araçları

Bu sayfa tekil bir host'u harden etmek için değil, güvenlik operasyonunu merkezileştirmek için vardır. Eğer elinizde birden fazla sunucu, ortak log ihtiyacı veya düzenli tarama yükü varsa buradaki araçlara geçersiniz.

## Ne Zaman Gerekli

- 1-2 host yerine bir fleet yönetiyorsanız
- Güvenlik olaylarını tek tek sunucularda değil merkezde görmek istiyorsanız
- Audit ve evidence toplama ihtiyacı artıyorsa
- Sadece "hardening" değil, "sürekli izleme" istiyorsanız

## Ne Zaman Gerekli Değil

- Tek host var ve önce basit baseline kurmanız gerekiyorsa
- Henüz `ssh`, `firewall`, `updates` ve `lynis` tamamlanmadıysa
- Log ve alarm sahipliği net değilse

## Araç Rolleri

### Wazuh

Wazuh, agent tabanlı merkezi güvenlik katmanıdır. Log toplama, FIM, detection ve alarm korelasyonu için kullanılır.

- Güçlü olduğu alan: merkezi görünürlük
- Zayıf olduğu alan: tek host üzerinde hızlı ve hafif kurulum
- Not: Wazuh, hardening yerine geçmez; sadece sinyal toplar

### Osquery

Osquery, sistemi SQL ile sorgulanabilir hale getirir. Anlık envanter, proses, port, paket ve kullanıcı görünürlüğü için uygundur.

- Güçlü olduğu alan: "şu an ne çalışıyor?" sorusu
- Zayıf olduğu alan: alarm platformu olmak
- Not: Osquery, telemetry sağlar; otomatik bloklama sağlamaz

### Nessus / OpenVAS

Bu araçlar dışarıdan veya ağ üzerinden zafiyet taraması yapar.

- Güçlü olduğu alan: CVE ve konfigürasyon taraması
- Zayıf olduğu alan: günlük host operasyonu
- Not: Lynis ile aynı şey değildir; Lynis içerden audit, bunlar daha geniş tarama yapar

## Karar Tablosu

| İhtiyaç | Başlangıç Aracı | Neden |
| :------ | :-------------- | :---- |
| Host hardening drift'i görmek | [Lynis](lynis.md) | En hızlı yerel audit |
| Merkezî güvenlik görünürlüğü | Wazuh | Agent + manager modeli |
| Ad-hoc sistem sorgulama | Osquery | Anlık ve esnek sorgu dili |
| Dış zafiyet taraması | Nessus / OpenVAS | Ağ tabanlı tarama |

## Rollout Sırası

1. Önce temel hardening'i bitir.
2. Log, alarm ve sahiplik modelini netleştir.
3. Agent'ı staging host'ta dene.
4. Veri akışını ve retention'ı doğrula.
5. Sonra production'a yay.

## Operasyonel Dikkatler

- Agent kurulumunu root erişimiyle, ama sınırlı yetki prensibiyle yap.
- Merkezî araçlar için servis hesabı, credential rotasyonu ve retention politikası belirle.
- Tarama araçlarını bakım penceresine koy; production anında ağır tarama yapma.
- Tek host için fazla karmaşık tool stack kurma; önce `lynis` ve `monitoring` yeterli olabilir.

## Verification

```bash
systemctl is-active wazuh-agent 2>/dev/null || true
osqueryi --version 2>/dev/null || true
lynis audit system -Q
```

Beklenen sonuç:

- Agent aktif görünmeli.
- Sorgu aracı sürümü okunabilmeli.
- Yerel audit çalışmalı.

## Handbook İlişkisi

- [Lynis](lynis.md) tekil host için ilk adımdır.
- [Uyumluluk](compliance.md) denetim raporu gerektiğinde devreye girer.
- [Monitoring](../how-to/monitoring.md) metrik ve alarm katmanını sağlar.
- [Runbooks](../runbooks/index.md) bu araçların ürettiği sinyallere göre hareket eder.
