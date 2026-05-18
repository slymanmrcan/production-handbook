# Runbooks

Bu bölüm, production ortamda "break-glass" müdahale akışlarını toplar. Amaç teori anlatmak değil; semptom görüldüğünde hangi komutla neye bakılacağını standartlaştırmaktır.

## Ne Zaman Runbook Açılır?

Şu durumlardan biri varsa doğrudan runbook açın:

- kullanıcı etkisi başladıysa
- hata oranı veya latency alarmı geldiyse
- deploy sonrası sistem davranışı bozulduysa
- DB, TLS, disk veya network tarafında servis kesintisi varsa

İlk hedef root cause bulmak değil, **etkiyi sınırlandırmak ve doğru veriyi toplamak** olmalıdır.

## Kritik Başlangıç Seti

En yüksek değerli ilk runbook'lar:

- [Olay Yonetimi](incident-response.md)
- [Servis Kesintisi](service-down.md)
- [Veritabani Down](db-down.md)
- [Deploy Geri Alma](deploy-rollback.md)
- [Backup Restore Basarisiz](backup-restore-fail.md)
- [TLS Yenileme Sorunu](tls-renewal.md)
- [Sertifika Suresi Doldu](cert-expired.md)
- [SSH Erisim Kesildi](ssh-lockout.md)

## Kategori Bazlı Navigasyon

### Uygulama ve Deploy

- [Servis Kesintisi](service-down.md)
- [Deploy Geri Alma](deploy-rollback.md)
- [Config Deploy Hatasi](config-deploy-fail.md)
- [LB Healthcheck](lb-healthcheck.md)

### Database ve Veri Güvenliği

- [Veritabani Down](db-down.md)
- [Replication Lag](replication-lag.md)
- [Backup Restore Basarisiz](backup-restore-fail.md)

### TLS, DNS ve Network

- [TLS Yenileme Sorunu](tls-renewal.md)
- [Sertifika Suresi Doldu](cert-expired.md)
- [DNS Sorunlari](dns-issues.md)
- [Network Latency](network-latency.md)
- [DDoS / Rate Limit](ddos-rate-limit.md)

### Host Kaynak ve Sistem Sağlığı

- [Disk Dolu](disk-full.md)
- [Inode Dolu](inode-full.md)
- [Disk IO](disk-io.md)
- [CPU Spike](cpu-spike.md)
- [OOM Kill / Memory Leak](oom-kill.md)

### Erişim ve Güvenlik

- [SSH Erisim Kesildi](ssh-lockout.md)
- [Olay Yonetimi](incident-response.md)

## Runbook Kullanım Kuralı

Bir runbook uygularken şu bilgileri mutlaka kaydedin:

- olayın başlangıç zamanı
- etkilenen servis / domain / host
- uygulanan komutlar
- görülen error mesajları
- rollback veya containment adımları

Bu veri postmortem ve tekrar önleme için gereklidir.

## Verify Matrix

| Kontrol | Komut / İşlem | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| Doğru runbook seçildi mi | Semptoma göre uygun sayfa açıldı mı | Yanlış problem tipi için yanlış runbook kullanılmamalı |
| Etki kaydı alındı mı | `date -u` ve incident notu | Başlangıç zamanı ve etki alanı kayda geçmiş olmalı |
| Evidence toplandı mı | Log / status / health çıktıları | Sonraki analiz için veri korunmuş olmalı |
| Çıkış kriteri net mi | Runbook doğrulama adımları | Servis geri dönüşü ölçülebilir olmalı |
