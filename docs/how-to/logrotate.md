# Logrotate Kurulumu

Bu rehber, Debian/Ubuntu ustunde uygulama ve servis loglarinin kontrol edilerek rotasyonunu standartlastirir. Amaç sadece disk doldurmamak degil; log kaybi, yetki sorunu ve broken rotation'i onceden engellemektir.

## Kapsam

Bu sayfa su durumlar icin kullanilir:

- file-based application loglari
- nginx, php-fpm, app worker, custom daemon loglari
- tek host uzerinde veya container disinda yazilan loglar

Journal icin ayri retention politikasi gerekir; bu sayfa esas olarak dosya tabanli loglar icindir.

## Politika

- Mümkünse uygulama logu `copytruncate` yerine dosyayi yeniden acacak sekilde tasarlansin.
- `copytruncate` sadece uygulama file descriptor'i yeniden acamiyorsa son care olsun.
- Rotasyon `daily`, `size`, `rotate`, `compress`, `dateext` ve uygun owner/group ile tanimlanmali.
- Her kuralin bir verify adimi olmali.

## Nereye Yazin

Logrotate kurallari genelde su dizinde tutulur:

```bash
/etc/logrotate.d/<app>
```

Merkezi konfigurasyon:

```bash
/etc/logrotate.conf
```

## Ornek Uygulama Kurali

Uygulama kendi log dosyasina yaziyorsa en saglam model budur:

```conf
/var/log/app/*.log {
  daily
  rotate 14
  missingok
  notifempty
  compress
  delaycompress
  dateext
  dateformat -%Y%m%d
  create 0640 appuser adm
  sharedscripts
  postrotate
    systemctl reload app.service >/dev/null 2>&1 || true
  endscript
}
```

### Neden Bu Ayarlar

- `create`: yeni dosya owner ve permission ile olusturulur
- `delaycompress`: son rotate edilen dosya bir sure acik kalsa bozulma riski azalir
- `dateext`: eski dosya adi tarihli olur, debug kolaylasir
- `postrotate`: app log dosyasini yeniden acsin diye reload tetiklenir
- `sharedscripts`: ayni blokta birden fazla dosya varsa reload'u bir kere calistirir

## Copytruncate Ne Zaman

Eger uygulama HUP/USR1 ile log dosyasini yeniden acamiyorsa:

```conf
/var/log/legacy-app/*.log {
  daily
  rotate 7
  missingok
  notifempty
  compress
  copytruncate
}
```

Bu modelde veri kaybi riski daha yuksektir. Uzun vadeli hedef, uygulamayi `create` + reload modeline tasimak olmalidir.

## Nginx ve Benzeri Servisler

Nginx gibi yeniden acma sinyali olan servislerde rotate sonrası reload beklenir:

```conf
/var/log/nginx/*.log {
  daily
  rotate 30
  missingok
  notifempty
  compress
  delaycompress
  sharedscripts
  postrotate
    [ -s /run/nginx.pid ] && kill -USR1 "$(cat /run/nginx.pid)" || true
  endscript
}
```

Bu model, open file descriptor'lari temiz bir sekilde yeni log dosyasina tasir.

## Test ve Dogrulama

Once dry-run calistir:

```bash
sudo logrotate -d /etc/logrotate.conf
sudo logrotate -v -f /etc/logrotate.conf
```

Ardindan dosya durumunu ve state'i kontrol et:

```bash
ls -lh /var/log/app/
sudo cat /var/lib/logrotate/status | rg 'app|nginx'
sudo logrotate -d /etc/logrotate.d/app
```

Ubuntu/Debian uzerinde logrotate genelde cron.daily ile tetiklenir. El ile degisiklikten sonra mutlaka bir kez debug ve bir kez force cycle yap.

## Troubleshooting

- Log rotate olmuyorsa config dosyasinin syntax'ini kontrol et.
- Kural calisiyor ama dosya buyuyorsa app yeni dosyayi acmiyordur.
- Yetki sorunu varsa `create` owner/group'u dogru verilmiyordur.
- `postrotate` fail oluyorsa servis reload mekanizmasi yanlistir.
- Disk doluysa sadece logrotate yetmez; retention ve journald ayari da gerekir.

## Verify Matrix

| Kontrol | Komut | Beklenen Sonuc |
| :------ | :---- | :------------- |
| Config okunuyor mu | `sudo logrotate -d /etc/logrotate.conf` | Parse hatasi olmamali |
| Kural calisiyor mu | `sudo logrotate -v -f /etc/logrotate.conf` | Rotate aksiyonu gorunmeli |
| Yeni dosya olustu mu | `ls -lh /var/log/app/` | Tarihli yeni dosya gorunmeli |
| Yetki dogru mu | `stat /var/log/app/*.log` | Owner/group beklenen degerde olmali |
| Servis reload oldu mu | `journalctl -u app.service -n 50 --no-pager` | Reload veya reopen gorunmeli |
| State tutuluyor mu | `sudo cat /var/lib/logrotate/status` | Rotate kaydi yazilmali |

## Common Mistakes

- Her yerde `copytruncate` kullanmak
- `postrotate` olmadan file-based log'u rotate etmeye calismak
- Owner/group tanimlamadan yeni dosya acmak
- `compress` var ama `delaycompress` yokken aktif log'u ziplemek
- `logrotate -d` calistirmadan prod'da degisiklik yapmak
- Sadece uygulama logunu rotate edip journald retention'i unutmak
