# Build ve Release

# Çıktı:
# android/app/build/outputs/bundle/release/app-release.aab
```

### APK (Alternative)

```bash
# Release APK oluştur
./gradlew assembleRelease

# Çıktı:
# android/app/build/outputs/apk/release/app-release.apk
```

### Build Temizleme

```bash
# Cache temizle
./gradlew clean

# Sonra tekrar build
./gradlew bundleRelease
```

---

### AAB vs APK: Hangisini Kullanmalı? 🤔

> [!IMPORTANT]
> **Google Play:** AAB **zorunlu** (2021'den beri)  
> **Diğer platformlar:** APK kullanılabilir

**Karşılaştırma:**

| Özellik             | AAB (Android App Bundle) | APK (Android Package)    |
| ------------------- | ------------------------ | ------------------------ |
| **Google Play**     | ✅ Zorunlu               | ❌ Artık kabul edilmiyor |
| **Dosya Boyutu**    | ✅ %35 daha küçük        | ❌ Daha büyük            |
| **Optimizasyon**    | ✅ Cihaza özel           | ❌ Evrensel              |
| **Direkt Yükleme**  | ❌ Mümkün değil          | ✅ Mümkün                |
| **F-Droid**         | ❌ Desteklemiyor         | ✅ Destekliyor           |
| **GitHub Releases** | ❌ Kullanıcı yükleyemez  | ✅ Direkt indirip yükler |

**Ne Zaman AAB?**

- ✅ Google Play Store'a yükleme
- ✅ Dosya boyutu önemli
- ✅ Otomatik optimizasyon istiyorsanız

**Ne Zaman APK?**

- ✅ Direkt kullanıcılara dağıtım
- ✅ F-Droid, APKPure gibi alternatif mağazalar
- ✅ GitHub Releases
- ✅ Kendi web sitenizden indirme
- ✅ Beta test (Google Play dışında)

---

### Alternatif Dağıtım Kanalları (APK)

#### 1. F-Droid (Açık Kaynak Uygulamalar)

**F-Droid Nedir?**

- Açık kaynak Android uygulamaları için alternatif mağaza
- Tamamen ücretsiz ve reklamsız
- Gizlilik odaklı (tracking yok)
- Kaynak kodu açık olmalı

**Nasıl Yayınlanır?**

```bash
# 1. Uygulamanızı açık kaynak yapın (GitHub)
# 2. F-Droid'e başvuru yapın
# https://f-droid.org/docs/Inclusion_Policy/

# 3. Metadata dosyası oluşturun
# fdroiddata/metadata/com.yourapp.txt

# 4. F-Droid build server'ı APK'yı oluşturur
# (Sizin keystore'unuz kullanılmaz, F-Droid'in kendi keystore'u)
```

**Avantajlar:**

- ✅ Tamamen ücretsiz
- ✅ Gizlilik odaklı kullanıcılar
- ✅ Otomatik güncellemeler
- ✅ Google Play'e alternatif

**Dezavantajlar:**

- ❌ Kaynak kodu açık olmalı
- ❌ F-Droid kendi keystore'u kullanır (Google Play ile aynı APK değil)
- ❌ İnceleme süreci uzun (haftalar)

---

#### 2. GitHub Releases (En Kolay)

**Nasıl Yapılır?**

```bash
# 1. Release APK oluştur
cd android && ./gradlew assembleRelease

# 2. GitHub'da release oluştur
# Repository → Releases → Create new release

# 3. APK'yı upload et
# Tag: v1.0.0
# Title: Version 1.0.0
# Description: Release notes
# Assets: app-release.apk (upload)

# 4. Publish release
```

**Kullanıcı İndirme:**

```
https://github.com/yourname/yourapp/releases/latest
→ app-release.apk indir
→ Cihaza yükle (Unknown sources aktif olmalı)
```

**Avantajlar:**

- ✅ Çok kolay
- ✅ Ücretsiz
- ✅ Versiyon kontrolü
- ✅ Changelog ekleyebilirsin

**Dezavantajlar:**

- ❌ Otomatik güncelleme yok
- ❌ Kullanıcı "Unknown sources" aktif etmeli
- ❌ Google Play kadar güvenilir değil (kullanıcı gözünde)

---

#### 3. APKPure / APKMirror

**APKPure:**

- Üçüncü parti APK mağazası
- Başvuru: https://apkpure.com/developer
- Ücretsiz

**APKMirror:**

- Sadece popüler uygulamalar
- Başvuru: https://www.apkmirror.com/apk-upload/

---

#### 4. Kendi Web Siteniz

**Basit Yöntem:**

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>MyApp Download</title>
  </head>
  <body>
    <h1>Download MyApp</h1>
    <a href="app-release.apk" download>
      <button>Download APK (v1.0.0)</button>
    </a>

    <h2>Installation:</h2>
    <ol>
      <li>Download APK</li>
      <li>Settings → Security → Enable "Unknown sources"</li>
      <li>Open APK file</li>
      <li>Install</li>
    </ol>
  </body>
</html>
```

**Hosting:**

- GitHub Pages (ücretsiz)
- Netlify (ücretsiz)
- Vercel (ücretsiz)
- Kendi sunucunuz

---

#### 5. Samsung Galaxy Store

**Samsung cihazlar için alternatif:**

- https://seller.samsungapps.com/
- APK kabul ediyor (AAB değil)
- Samsung cihazlarda pre-installed

---

### Dağıtım Stratejisi Önerisi

**Çoklu Platform Stratejisi:**

```
1. Google Play Store (AAB)
   ├─ Ana dağıtım kanalı
   ├─ Otomatik güncellemeler
   └─ En geniş kitle

2. F-Droid (APK - açık kaynak)
   ├─ Gizlilik odaklı kullanıcılar
   ├─ Açık kaynak topluluğu
   └─ Google-free cihazlar

3. GitHub Releases (APK)
   ├─ Beta testerlar
   ├─ Erken erişim
   └─ Geliştirici topluluğu

4. Kendi Web Siteniz (APK)
   ├─ Direkt kontrol
   ├─ Analytics
   └─ Özel landing page
```

**Örnek Senaryo:**

```bash
# 1. Google Play için AAB
./gradlew bundleRelease
# → Play Console'a yükle

# 2. F-Droid / GitHub / Web için APK
./gradlew assembleRelease
# → GitHub Releases'e yükle
# → Web sitene yükle
```

> [!TIP]
> **Best Practice:**
