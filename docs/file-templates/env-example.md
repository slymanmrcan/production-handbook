# Environment Variables Example (.env)

Bu dosya bir deployment checklist degil, uygulamanin bekledigi secret ve runtime ayarlarinin standart listesidir. Amaç, degerleri tek yerde toplamak ve hangi alanin repo disinda tutulmasi gerektigini netlestirmektir.

## Ne Icin Kullanilir

- local development ile production arasindaki ayarlari ayirmak
- secret degerleri image veya compose dosyasina gommemek
- deploy oncesi eksik degiskenleri gorunur hale getirmek

## Safe Defaults

- `APP_ENV=production` ile prod modunu acik yaz
- network'e acik servislerde `0.0.0.0` yerine bind address'i explicit belirle
- database ve redis icin host/port degiskenlerini compose servis adlariyla uyumlu tut
- secret alanlara ornek deger yaz, gercek credential koyma
- `DB_PASS`, `REDIS_PASS`, `APP_SECRET` gibi alanlari repo disinda tut

## Template

```ini
# --- Application ---
APP_ENV=production
APP_HOST=127.0.0.1
APP_PORT=3000
APP_SECRET=change_this_to_a_long_random_string
APP_LOG_LEVEL=info

# --- Database ---
DB_HOST=db
DB_PORT=5432
DB_NAME=myapp
DB_USER=postgres
DB_PASS=replace_me_with_a_secret

# --- Redis ---
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASS=replace_me_with_a_secret

# --- External APIs ---
AWS_ACCESS_KEY=replace_me
AWS_SECRET_KEY=replace_me
```

## Secret Handling

- production'da `.env` dosyasini git'e koyma
- secret degerleri `.env.production`, secret manager veya CI secret store icinde sakla
- compose veya systemd unit icinde secret'i loglama
- `set -x` ile calisan scriptlerde secret okuya-basma yapma

## Validation

```bash
test -f .env.production
grep -E '^(APP_SECRET|DB_PASS|REDIS_PASS|AWS_SECRET_KEY)=' .env.production
```

Beklenen durum:

- dosya mevcut olmali
- kritik alanlar bos olmamali
- degerler ornek/gizli olmali, gercek sifreler repo'da gorunmemeli

## Deployment Verification

```bash
docker compose config
docker compose up -d
docker compose exec app printenv | rg 'APP_ENV|APP_PORT|DB_HOST|REDIS_HOST'
```

Deploy sonrasinda sunlari kontrol et:

- uygulama dogru portta ayaga kalkti mi
- database ve redis host adlari resolve oldu mu
- secret degerler uygulamaya ulasiyor mu
- `docker compose config` compose interpolation hatasi vermiyor mu
