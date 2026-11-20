# Cowrie Honeypot Log Analizi

Cowrie'yi üretim ağı ve kimlik bilgilerinden ayrılmış bir laboratuvar sunucusunda inceleyin. Aşağıdaki örneklerde host üzerindeki JSON log yolu `/mnt/block/cowrie/var/log/cowrie/cowrie.json` ve Compose servis adı `cowrie` olarak varsayılır. Kurulumunuz farklıysa volume yolu ve servis adını uyarlayın. [Honeypot ve Tarpit](tarpit.md)

## 1. Servis ve Log Durumu

```bash
cd /mnt/block/cowrie
docker compose ps
docker compose logs --tail=50 cowrie
stat /mnt/block/cowrie/var/log/cowrie/cowrie.json
```

JSON olayları dışarıdan gelen kullanıcı girdileri içerebilir. Analiz ve raporlama çıktılarında yalnızca gereken alanları seçin. Aşağıdaki sorgu giriş sonucu ve oturum bilgilerini gösterir.

```bash
log_file=/mnt/block/cowrie/var/log/cowrie/cowrie.json

tail -n 100 "$log_file" | jq -c '
  select(.eventid == "cowrie.login.success" or .eventid == "cowrie.login.failed")
  | {timestamp, eventid, src_ip, username, session}
'
```

Sorgu, aktif log dosyasının son 100 satırını kapsar. Belirli bir zaman aralığı için rotasyondaki dosyaları da hesaba katın. İndirilen dosyaları karantinada tutun ve incelemeyi ayrılmış analiz ortamında yürütün.

Olay tiplerinin dağılımı ve belirli bir oturumun zaman çizelgesi için JSON alanlarını seçin. Örnekteki oturum kimliğini logdan aldığınız değerle değiştirin.

```bash
log_file=/mnt/block/cowrie/var/log/cowrie/cowrie.json

jq -r '.eventid // empty' "$log_file" | sort | uniq -c | sort -rn
jq -c --arg session 'ORNEK_OTURUM' '
  select(.session == $session) | {timestamp, eventid, src_ip}
' "$log_file"
```

## 2. Yerel HTML Raporu

Operatör hesabıyla çalıştırın. Rapor, logdaki son 50 olayın zamanını, türünü ve kaynak adresini gösterir. Dinamik alanlar HTML bağlamına uygun biçimde kodlanır. Çıktıyı özel operatör dizininde tutun ve yetkili erişimle açın.

```bash
(
    set -Eeuo pipefail
    umask 077

    log_file=/mnt/block/cowrie/var/log/cowrie/cowrie.json
    report_dir="$HOME/.local/state/cowrie"
    install -d -m 0700 "$report_dir"
    report_tmp=$(mktemp "$report_dir/report.XXXXXX")
    trap 'rm -f -- "$report_tmp"' EXIT

    {
        printf '%s\n' '<!doctype html><html lang="tr"><meta charset="utf-8">'
        printf '%s\n' '<title>Cowrie olayları</title><h1>Cowrie olayları</h1>'
        printf '%s\n' '<table><thead><tr><th>Zaman</th><th>Olay</th><th>Kaynak IP</th></tr></thead><tbody>'
        tail -n 50 "$log_file" | jq -r '
            [.timestamp, .eventid, .src_ip]
            | map((. // "—") | tostring | @html)
            | "<tr><td>\(.[0])</td><td>\(.[1])</td><td>\(.[2])</td></tr>"
        '
        printf '%s\n' '</tbody></table></html>'
    } > "$report_tmp"
    mv -f -- "$report_tmp" "$report_dir/report.html"
)
```

Raporu ya da ham logları bir web köküne kopyalamayın. Eski kurulumda web sunucusuna bağlanmış `honeypot.html` varsa yayını kaldırın ve ilgili URL'nin artık raporu sunmadığını doğrulayın.

## 3. İzinler ve Saklama

```bash
docker compose exec -T cowrie id
namei -l /mnt/block/cowrie/var/log/cowrie/cowrie.json
du -sh /mnt/block/cowrie/var
```

Container'ın kullanıcı ve grup kimliğini, host'taki volume sahipliği ve izinleriyle karşılaştırın. UID eşlemesi kullanılıyorsa host'ta eşlenen kimliği dikkate alın. Yalnızca yazılması gereken log veya state dizininin sahipliğini düzeltin ve operatöre gereken dosyalar için okuma erişimi verin. Yinelenen rotasyon işlerini kontrol edin. [Logrotate](../how-to/logrotate.md) rehberine göre saklama sürelerini belirleyin ve olayla ilgili logları rotasyondan bağımsız koruyun.

## Doğrulama

```bash
docker compose ps
stat "$HOME/.local/state/cowrie/report.html"
```

Cowrie'nin çalıştığını, yeni olayın loga yazıldığını ve raporun yalnızca operatör tarafından okunabildiğini doğrulayın. Raporda zaman, olay türü ve kaynak IP alanları görünmelidir. [OWASP HTML çıktı kodlama kuralları](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
