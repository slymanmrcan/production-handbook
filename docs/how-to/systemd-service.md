# Systemd Servis Tanimi

Bu rehber, Linux host üzerinde çalışan uygulamayı `systemd` ile yönetilebilir ve izlenebilir hale getirmeyi anlatır. Servis dosyası sadece "çalıştırma komutu" değildir; restart, logs, hardening ve lifecycle burada tanımlanır.

## 1. Systemd Bir Serviste Neleri Çözer?

- servis boot sırasında otomatik başlar
- beklenmedik şekilde kapanırsa yeniden ayağa kalkar
- log'lar `journalctl` ile takip edilir
- bağımlılıklar ve çalışma sırası kontrol altına alınır
- servis hardening seçenekleriyle host saldırı yüzeyi azaltılır

## 2. Birim Dosyası Anatomisi

Temel bölümler:

- `[Unit]`: açıklama, bağımlılıklar, start sırası
- `[Service]`: nasıl çalışacağı, hangi kullanıcıyla çalışacağı, restart politikası
- `[Install]`: hangi target altında enable edileceği

Örnek servis:

`/etc/systemd/system/app.service`:

```ini
[Unit]
Description=App Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=deployer
Group=deployer
WorkingDirectory=/opt/app
EnvironmentFile=-/etc/default/app
ExecStartPre=/usr/bin/test -x /opt/app/start.sh
ExecStart=/opt/app/start.sh
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
KillSignal=SIGTERM
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/opt/app /var/log/app

[Install]
WantedBy=multi-user.target
```

## 3. Alanların Anlamı

### `[Unit]`

- `After=network-online.target`: servis ağ hazır olduktan sonra başlar.
- `Wants=network-online.target`: ağ hedefini istemesi için ek sinyal.

### `[Service]`

- `Type=simple`: çoğu web uygulaması için yeterli.
- `User` / `Group`: root ile çalışmayı önler.
- `WorkingDirectory`: relative path kullanan uygulamalar için önemlidir.
- `EnvironmentFile`: secret veya runtime config için temiz bir giriş noktasıdır.
- `ExecStartPre`: servis başlamadan önce kontrol veya hazırlık adımı.
- `Restart=on-failure`: sadece hata durumunda yeniden başlatır.
- `TimeoutStopSec`: düzgün shutdown için süre verir.
- `NoNewPrivileges`, `ProtectSystem`, `ProtectHome`, `PrivateTmp`: temel hardening sağlar.

### `[Install]`

- `WantedBy=multi-user.target`: servis normal server boot akışında enable edilebilir.

## 4. Restart Politikası

Servis türüne göre restart davranışı farklı olmalıdır:

- `Restart=on-failure`: genel web servisleri için en güvenli başlangıç
- `Restart=always`: sürekli daemon veya kendi kendine kapanması istenmeyen servisler için
- `Restart=no`: kısa ömürlü job'lar için

Önerilen başlangıç:

```ini
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5
```

Bu ayar yanlış binary veya sürekli crash eden servislerin sonsuz döngüye girmesini azaltır.

## 5. Log ve Çalıştırma Akışı

Servis logları journal'a düşer:

```bash
journalctl -u app -f
```

İlk kurulum sonrası bakılacaklar:

```bash
systemctl status app --no-pager
systemctl show -p MainPID -p Restart -p NRestarts app
journalctl -u app -n 50 --no-pager
```

İşletme sırasında log seviyesini uygulama tarafında da kontrollü tutun. Systemd sadece taşıyıcıdır; gerçek uygulama log formatı ayrı standarda sahip olmalıdır.

## 6. Reload, Restart ve Daemon-Reexec

### `daemon-reload`

Unit dosyası değiştiğinde systemd'ye yeniden okutmanız gerekir:

```bash
sudo systemctl daemon-reload
```

### `reload`

Uygulama config'i değişti ama proses kapanmadan yeniden yüklenebiliyorsa `reload` kullanın.

### `restart`

Binary değiştiyse, environment değiştiyse veya uygulama reload desteklemiyorsa `restart` kullanın.

Güvenli işletim akışı:

```bash
sudo systemctl reload app
sudo systemctl restart app
sudo systemctl reload-or-restart app
```

`reload-or-restart`, uygulama reload destekliyorsa onu kullanır; değilse restart eder.

## 7. Enable ve Disable

Servisi boot'ta açmak:

```bash
sudo systemctl enable --now app
```

Boot'tan kaldırmak:

```bash
sudo systemctl disable --now app
```

Üretimde servis dosyası hazır olmadan `enable` etmeyin. Önce `systemd-analyze verify` çalıştırın.

## 8. Hardening Drop-In

Unit dosyasını kirletmek istemiyorsanız drop-in kullanın:

```bash
sudo systemctl edit app
```

Örnek override:

```ini
[Service]
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/opt/app /var/log/app
```

Bu yöntem güncelleme sırasında vendor unit'i korur.

## 9. Uygulama Çalıştırma Örnekleri

Başlatma scripti yerine doğrudan binary de çalıştırabilirsiniz:

```ini
ExecStart=/usr/local/bin/myapp --config /etc/app/app.yml
```

Environment file ile:

```ini
EnvironmentFile=/etc/default/app
ExecStart=/usr/local/bin/myapp --port ${APP_PORT}
```

`EnvironmentFile` içeriği:

```bash
APP_PORT=8080
APP_LOG_LEVEL=info
```

## 10. Troubleshooting

### Servis başlamıyor

```bash
systemctl status app --no-pager
journalctl -u app -b --no-pager
systemd-analyze verify /etc/systemd/system/app.service
```

### Port başka bir proses tarafından kullanılıyor

```bash
ss -tulpn | grep 8080
```

### Servis sürekli yeniden başlıyor

```bash
systemctl show -p NRestarts -p Restart app
journalctl -u app -n 100 --no-pager
```

### Reload işlemiyor

Uygulama reload sinyali desteklemiyor olabilir. O durumda `restart` kullanın veya `ExecReload` tanımlayın.

## 11. Verify Matrix

| Kontrol | Komut | Beklenen Sonuç |
| :------ | :---- | :------------- |
| Unit syntax doğru mu | `systemd-analyze verify /etc/systemd/system/app.service` | Hata dönmemeli |
| Daemon okundu mu | `sudo systemctl daemon-reload` | Hata dönmemeli |
| Enable edildi mi | `systemctl is-enabled app` | `enabled` dönmeli |
| Servis çalışıyor mu | `systemctl status app --no-pager` | `active (running)` olmalı |
| Loglar görünür mü | `journalctl -u app -n 20 --no-pager` | Uygulama logları görünmeli |
| Restart politikası | `systemctl show -p Restart -p RestartSec app` | Beklenen değerler görünmeli |
| PID yaşıyor mu | `systemctl show -p MainPID app` | MainPID sıfır olmamalı |

## 12. Pratik Kural

Servis dosyası deploy edildiğinde şu sıra uygulanmalı:

1. `systemd-analyze verify`
2. `systemctl daemon-reload`
3. `systemctl enable --now app`
4. `systemctl status app`
5. `journalctl -u app`

Bu sıra atlanırsa hatayı unit dosyasından mı uygulamadan mı kaynaklandığını ayırmak zorlaşır.
