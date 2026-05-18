# Recipes Portal

Bu sayfa, hazir uygulama ve gateway recipe'lerini secmek icin giris noktasi olarak kullanilir. Recipe'ler, `how-to` sayfalarindan farkli olarak tek bir deployment pattern'e odaklanir; `file-templates` ise bu pattern'in ham konfigurasyon parcalarini verir.

## Ne Nedir

- `recipes`: belirli bir stack icin opinionated production baseline
- `how-to`: sistem yonetimi ve operasyonel adimlar
- `file-templates`: tekrar kullanilabilir config iskeletleri

## Nasıl Secilir

1. Once uygulama turunu belirle.
2. Sonra edge katmani gerekip gerekmedigine bak.
3. Uygulama stateful ise recipe ile birlikte backup ve storage how-to'larini oku.
4. Public trafik varsa gateway recipe'sini, yalnizca runtime ise app recipe'sini sec.

## Secim Rehberi

### Frontend / SPA

React, Vue veya Angular gibi build cikisi veren frontend'ler icin [React + Nginx](react.md) kullan.

### .NET Uygulamalari

ASP.NET Core API veya worker uygulamalari icin [.NET Recipe](dotnet.md) kullan.

### Reverse Proxy / Edge

TLS termination, routing ve rate limit icin [Nginx Recipe](nginx.md) kullan.

## Recipe ile How-To Iliskisi

- Recipe, deploy pattern'i soyler.
- How-to, host uzerinde yapilacak operasyonlari tarif eder.
- Template, recipe icinde kullanilan config parcasini standartlastirir.

Ornek akış:

1. [Temel OS](../how-to/base-os.md) ile host'u hazirla.
2. Gerekirse [Cloud-Init](../how-to/cloud-init.md) ile otomasyonu standardize et.
3. Uygun recipe'yi sec.
4. Gerekli template'leri ilgili sayfalardan al.
5. Runbook ve verification adimlariyla devreye al.

## Operasyonel Not

Recipe'ler son karar defteri degildir. Production'da degisen gereksinimler varsa, recipe'yi ayarlamadan once ilgili `how-to` veya `runbook` sayfasini da guncelle.

## Hızlı Erişim

- [React + Nginx](react.md)
- [.NET Recipe](dotnet.md)
- [Nginx Recipe](nginx.md)
