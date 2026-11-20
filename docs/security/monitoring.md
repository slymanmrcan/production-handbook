# Güvenlik İzleme ve Alarmlar

Güvenlik izlemesi için erişim kayıtlarını, host ve container metriklerini ve ağ trafiğini aynı zaman aralığında karşılaştırın. Canlı bir ihlal şüphesinde [Şüpheli Sunucu ve Yetkisiz Erişim](../runbooks/suspected-compromise.md) rehberinden başlayın.

## Hangi Sinyali İzlemeli?

| Sinyal | Karşılaştırma | İlk inceleme |
| :----- | :------------ | :----------- |
| Başarılı SSH girişi | Bilinen kullanıcı, anahtar, VPN veya bastion IP'si, bakım saati | Tanınmayan `Accepted` kayıtlarını merkezi log ve kimlik kayıtlarıyla eşleştirin |
| Art arda başarısız giriş | O sunucunun olağan tarama ve giriş profili | Kullanıcı, kaynak ve zaman aralığına bakın. Aynı aralıktaki başarılı girişleri kontrol edin |
| Sürekli yüksek CPU | Normal iş yükü, backup, deploy ve trafik | `top` ve `vmstat` ile CPU, I/O beklemesi ve steal time'ı ayrıştırın |
| Beklenmeyen ağ trafiği | İzinli hedefler, trafik yönü ve normal hacim | Ağ, proxy veya sağlayıcı akış kayıtlarında hedef, hacim ve zamanı doğrulayın |
| Yeni servis, timer, yetki veya anahtar | Onaylı envanter ve değişiklik kaydı | [AIDE](fim.md), kimlik ve sistem kayıtlarında değişikliği doğrulayın |
| Log akışında kesilme | En son bilinen sağlıklı olay ve beklenen kaynaklar | Collectoru, disk ve retention durumunu, ayrıca merkezi hedefin erişimini kontrol edin |

`ESTAB` sayısı, belli bir andaki kurulu TCP bağlantılarını ölçer. DDoS veya giden trafik için yön, süre, hacim ve edge kayıtlarına ihtiyacınız vardır. IPv4 ve IPv6'yı birlikte izleyin.

## CPU Alarmı ve Olay İncelemesi

[Monitoring Stack](../how-to/monitoring-stack.md) içindeki `HighCpuUsage` kuralı, beş dakikalık ortalama non-idle CPU oranını hesaplar ve eşik 10 dakika aşıldığında uyarır. Yüzde 80 başlangıç eşiğidir. Normal iş yüküne göre değiştirin ve backup/deploy saatleriyle birlikte yorumlayın.

```bash
vmstat 1 6
top
sudo ss -Htnp state established
sudo journalctl --utc -u ssh.service --since '1 hour ago' --no-pager
```

`vmstat` ilk satırda açılıştan itibaren ortalamayı verir. Sonraki satırlarda `us`, `sy`, `wa` ve `st` değerlerini karşılaştırın. `top` ile birkaç örnekte hangi süreçlerin CPU tükettiğine bakın. Container'ların ağ ve süreç görünümü için [runbook'taki kontrolleri](../runbooks/suspected-compromise.md) kullanın.

## Kayıt ve Bildirim

SSH, yetki değişiklikleri ve uygulama loglarını [Merkezi Loglama](../how-to/centralized-logging.md) üzerinden sunucu dışında saklayın. Linux sunucusundan bağımsız bulut erişim ve kimlik kayıtlarını da açık tutun. Bildirimde host, UTC zamanı, sinyal ve ilgili rehber bulunmalı. Tam loglara erişimi sınırlandırın ve kimlik bilgilerini bildirimlere eklemeyin.

## Doğrulama

- Monitoring Compose dizininde `docker compose exec -T prometheus promtool check rules /etc/prometheus/rules.yml` çalıştırın. Test ortamında üretilen alarmın Alertmanager'dan tanımlı kanala ulaştığını doğrulayın.
- İzinli bir test SSH oturumu açın. `journalctl -u ssh.service --since '5 minutes ago' --no-pager` ile kaydı bulun ve aynı olayın merkezi depoda doğru host ve zamanla göründüğünü doğrulayın.
- Kaynak beklenen sürede veri üretmiyorsa durumu gecikme veya kayıp olarak işaretleyin. Olay bilgileriyle ilişkilendirmek için [Şüpheli Sunucu](../runbooks/suspected-compromise.md) rehberine dönün.
