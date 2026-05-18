# Android Keystore ve APK İmzalama Rehberi

> [!WARNING]
> **Gizli Döküman:** Bu sayfa navigasyonda görünmez. Sadece doğrudan URL ile erişilebilir.
>
> **Güvenlik Uyarısı:** Keystore dosyası ve şifreleri **asla** Git'e commit etmeyin!

React Native Android uygulamanızı Google Play Store'a yüklemek için APK/AAB dosyasını imzalamanız gerekir. Bu rehber tüm süreci adım adım anlatır.

---

## Keystore Nedir? 🔑

**Keystore**, Android uygulamanızı imzalamak için kullanılan dijital sertifika deposudur.

**Önemli Noktalar:**

- Her uygulama **benzersiz** bir keystore ile imzalanmalıdır
- Keystore **kaybedilirse**, uygulamanızı **asla güncelleyemezsiniz**
- Google Play, aynı keystore ile imzalanmış APK'ları aynı uygulama olarak tanır
- Keystore şifresini **unutmayın** - kurtarma yolu yoktur!

### Tek Keystore vs Çoklu Keystore (Çok Önemli!) 🎯

> [!CAUTION]
> **Birden fazla uygulama geliştiriyorsanız:**
>
> **❌ YANLIŞ:** Tüm uygulamalar için aynı keystore  
> **✅ DOĞRU:** Her uygulama için ayrı keystore

**Neden Her Uygulama İçin Ayrı Keystore?**

| Senaryo             | Tek Keystore                                         | Çoklu Keystore                                |
| ------------------- | ---------------------------------------------------- | --------------------------------------------- |
| **Güvenlik**        | ❌ Bir keystore sızarsa tüm uygulamalar risk altında | ✅ Sadece 1 uygulama etkilenir                |
| **Uygulama Satışı** | ❌ Keystore'u paylaşmak zorunda kalırsın             | ✅ Sadece o uygulamanın keystore'unu verirsin |
| **Organizasyon**    | ❌ Hangi keystore hangi app'e ait belli değil        | ✅ Her keystore açıkça etiketli               |
| **Keystore Kaybı**  | ❌ Tüm uygulamalar güncelleme alamaz                 | ✅ Sadece 1 uygulama etkilenir                |

**Önerilen İsimlendirme:**

```bash
# ❌ YANLIŞ (genel isim)
my-upload-key.keystore

# ✅ DOĞRU (uygulama özel)
expense-tracker-upload-key.keystore
todo-app-upload-key.keystore
fitness-app-upload-key.keystore
```

**Dosya Yapısı Örneği:**

```
~/keystores/
├── expense-tracker/
│   ├── expense-tracker-upload-key.keystore
│   └── keystore-info.txt  (şifreler, alias)
├── todo-app/
│   ├── todo-app-upload-key.keystore
│   └── keystore-info.txt
└── fitness-app/
    ├── fitness-app-upload-key.keystore
    └── keystore-info.txt
```

> [!TIP]
> **Best Practice:**
>
> - Her uygulama için ayrı klasör
> - Keystore adında uygulama adı olsun
> - Şifreleri `keystore-info.txt` dosyasında sakla (şifreli cloud'da)

---

## Keystore Oluşturma 🛠️

### Gereksinimler

```bash
# Java JDK kurulu olmalı (React Native sürümünüze uygun)
java -version

# keytool komutu JDK ile gelir
keytool -version
```

> [!IMPORTANT]
> **JDK Sürüm Uyumluluğu:**
>
> - React Native 0.73+: **JDK 17** (önerilen)
> - React Native 0.68-0.72: JDK 11 veya 17
> - Eski versiyonlar: JDK 8 veya 11
>
> Yanlış JDK sürümü build hatalarına neden olur!

### Keystore Oluşturma Komutu

```bash
# Proje root dizininde
cd android/app

# Keystore oluştur (ÖNERİLEN)
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore my-upload-key.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -sigalg SHA256withRSA
```

**Parametreler:**

- `-storetype PKCS12`: Modern keystore formatı (önerilen)
- `-keystore my-upload-key.keystore`: Keystore dosya adı
- `-alias my-key-alias`: Key alias (hatırlayın!)
- `-keyalg RSA`: Algoritma
- `-keysize 2048`: Key boyutu
- `-validity 10000`: Geçerlilik süresi (gün) - **Minimum 25 yıl gerekli!**
- `-sigalg SHA256withRSA`: İmza algoritması (uyumluluk için)

> [!CAUTION]
> **validity Parametresi Kritik:**
> Google Play, sertifikanın **en az 22 Ekim 2033** tarihine kadar geçerli olmasını şart koşar.
> 10000 günden (27 yıl) az verilirse ileride güncelleme sorunu yaşanabilir!

### İstenecek Bilgiler

```
Enter keystore password: ********
Re-enter new password: ********

What is your first and last name?
  [Unknown]:  John Doe

What is the name of your organizational unit?
  [Unknown]:  Development

What is the name of your organization?
  [Unknown]:  MyCompany

What is the name of your City or Locality?
  [Unknown]:  Istanbul

What is the name of your State or Province?
  [Unknown]:  Istanbul

What is the two-letter country code for this unit?
  [Unknown]:  TR

Is CN=John Doe, OU=Development, O=MyCompany, L=Istanbul, ST=Istanbul, C=TR correct?
  [no]:  yes

Enter key password for <my-key-alias>
        (RETURN if same as keystore password): ********
```

> [!IMPORTANT]
> **Şifreleri Kaydedin:**
>
> - Keystore password
> - Key alias
> - Key password
>
> Bu bilgileri **güvenli bir yerde** (password manager) saklayın!

---

## Keystore'u Güvenli Saklama 🔒

### .gitignore'a Ekleyin

```bash
# android/app/.gitignore
*.keystore
*.jks
```

### Yedekleme

```bash
# Keystore'u güvenli bir yere yedekleyin
# Örnek: Şifreli cloud storage, password manager

# ÖNEMLİ: Birden fazla yerde yedek tutun!
# - Cloud storage (şifreli)
# - External hard drive
# - Password manager
```

### Keystore Bilgilerini Saklama

**gradle.properties (local):**

```bash
# android/gradle.properties (GIT'E EKLEMEYİN!)
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=your_keystore_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

> [!WARNING]
> `gradle.properties` dosyasını **asla** Git'e eklemeyin!

---

## Gradle Konfigürasyonu ⚙️

### android/app/build.gradle (Hibrit Yaklaşım)

```gradle
android {
    ...
    defaultConfig { ... }

    // Signing configs (Env Vars > gradle.properties)
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // Öncelik: Environment Variables -> gradle.properties
            def keystoreFile = System.getenv("MYAPP_UPLOAD_STORE_FILE") ?: project.findProperty("MYAPP_UPLOAD_STORE_FILE")
            def keystorePassword = System.getenv("MYAPP_UPLOAD_STORE_PASSWORD") ?: project.findProperty("MYAPP_UPLOAD_STORE_PASSWORD")
            def keyAlias = System.getenv("MYAPP_UPLOAD_KEY_ALIAS") ?: project.findProperty("MYAPP_UPLOAD_KEY_ALIAS")
            def keyPassword = System.getenv("MYAPP_UPLOAD_KEY_PASSWORD") ?: project.findProperty("MYAPP_UPLOAD_KEY_PASSWORD")

            if (keystoreFile) {
                storeFile file(keystoreFile)
                storePassword keystorePassword
                keyAlias keyAlias
                keyPassword keyPassword
            }
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Proguard/R8 minification
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'

            // Signing
            signingConfig signingConfigs.release
        }
    }
}
```

> [!TIP]
> **Hibrit Yaklaşım Avantajları:**
>
> - Local development: `gradle.properties` kullanır
> - CI/CD: Environment variables kullanır (daha güvenli)
> - `gradle.properties` dosyası oluşturmaya gerek kalmaz

### ProGuard/R8 Rules (Detaylı)

```proguard
# android/app/proguard-rules.pro

# ===== React Native Core =====
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }

# ===== Retrofit (API Calls) =====
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# ===== OkHttp =====
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ===== Gson/JSON =====
-keep class com.google.gson.** { *; }
-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

# ===== Firebase =====
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**

# ===== Your App Models =====
-keep class com.yourapp.models.** { *; }
-keep class com.yourapp.api.** { *; }

# ===== General =====
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-renamesourcefileattribute SourceFile
```

---

## Release APK/AAB Oluşturma 📦

### AAB (Android App Bundle) - Önerilen

```bash
# Proje root dizininde
cd android

# Release AAB oluştur
./gradlew bundleRelease

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
>
> - Google Play: AAB (zorunlu)
> - Diğer her yer: APK
> - Her ikisini de aynı keystore ile imzala!

---

## APK/AAB Test Etme 🧪

### AAB'yi APK'ya Çevirme (Test İçin)

```bash
# bundletool indir
# https://github.com/google/bundletool/releases

# AAB'den APK oluştur
java -jar bundletool.jar build-apks \
  --bundle=app-release.aab \
  --output=app-release.apks \
  --mode=universal

# APK'yı extract et
unzip app-release.apks -d output

# Cihaza yükle
adb install output/universal.apk
```

### İmza Doğrulama

```bash
# APK imzasını kontrol et
jarsigner -verify -verbose -certs app-release.apk

# Detaylı bilgi
keytool -printcert -jarfile app-release.apk
```

---

## Google Play Upload 🚀

### Play Console'da Uygulama Oluşturma

1. [Google Play Console](https://play.google.com/console)'a girin
2. "Create app" tıklayın
3. Uygulama bilgilerini doldurun
4. "Create app" tıklayın

### AAB Upload

1. **Production** > **Releases** > **Create new release**
2. AAB dosyasını upload edin
3. Release notes ekleyin
4. **Review release** > **Start rollout to production**

### App Signing by Google Play (Önerilen)

> [!CAUTION]
> **ZORUNLU HALE GELİYOR (2025):**
> Google Play App Signing, **2025 sonuna kadar tüm yeni uygulamalar için zorunlu** olacak!
> Mevcut uygulamalar için de **şiddetle önerilir**.

> [!TIP]
> **Google Play App Signing** kullanmanız önerilir:
>
> - Google, keystore'unuzu yönetir
> - Keystore kaybı riski ortadan kalkar
> - Upload key ile signing key ayrılır

**Nasıl Aktif Edilir:**

1. Play Console > **Setup** > **App signing**
2. **Use Google Play App Signing** seçin
3. Upload key'inizi yükleyin

**Upload Key vs Signing Key:**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│      Sen        │    │   Google Play    │    │   Kullanıcı     │
│  Upload Key     │ ──►│  Signing Key     │ ──►│   İndirir       │
│   (senin)       │    │  (Google'ın)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Farklar:**

| Özellik          | Upload Key                | Signing Key                 |
| ---------------- | ------------------------- | --------------------------- |
| **Sahibi**       | Sen oluşturursun          | Google saklar               |
| **Kullanım**     | AAB'yi Google'a yüklerken | Cihazlara dağıtırken        |
| **Kaybedilirse** | ✅ Yenilenebilir          | ❌ Google saklar, sorun yok |
| **Güvenlik**     | Senin sorumluluğun        | Google'ın sorumluluğu       |

> [!TIP]
> **Mevcut Uygulamayı App Signing'e Taşıma:**
>
> Eğer daha önce App Signing olmadan yayınladıysanız:
>
> 1. Play Console → Setup → App signing
> 2. "Use a different key" seç
> 3. PEPK tool ile mevcut keystore'u export et:
>
> ```bash
> java -jar pepk.jar \
>   --keystore=my-upload-key.keystore \
>   --alias=my-key-alias \
>   --output=encrypted_private_key.zip \
>   --encryptionkey=GOOGLE_PROVIDED_KEY
> ```
>
> 4. `encrypted_private_key.zip`'i upload et

### APK İmza Şemaları (V1/V2/V3)

**İmza Şemaları:**

| Şema     | Android | Açıklama                     |
| -------- | ------- | ---------------------------- |
| V1 (JAR) | Tümü    | Eski yöntem, yavaş doğrulama |
| V2       | 7.0+    | APK Signature Scheme v2      |
| V3       | 9.0+    | Key rotation desteği         |
| V4       | 11+     | Incremental installs         |

**Gradle Konfigürasyonu:**

```gradle
// android/app/build.gradle
android {
    signingConfigs {
        release {
            // ... (keystore config)

            // İmza şemalarını aktif et
            v1SigningEnabled true
            v2SigningEnabled true
            enableV3Signing true  // Key rotation (API 28+)
            enableV4Signing true  // Incremental installs (API 30+)
        }
    }
}
```

> [!NOTE]
> **V3/V4 Signing:**
>
> - `enableV3Signing`: Key rotation desteği (Android 9.0+)
> - `enableV4Signing`: Incremental updates (Android 11+)
> - Her ikisi de performans artışı sağlar

---

## Version Yönetimi 📈

### android/app/build.gradle

```gradle
android {
    defaultConfig {
        applicationId "com.yourapp"
        minSdkVersion 21
        targetSdkVersion 34  // Google Play minimum requirement (2024+)

        // Version Code (her release'de artırın)
        versionCode 1

        // Version Name (kullanıcıya gösterilen)
        versionName "1.0.0"
    }
}
```

> [!WARNING]
> **Target SDK Zorunluluğu:**
> Google Play, her yılın sonuna doğru yeni uygulamalar ve güncellemeler için `targetSdkVersion`'ı yükseltmeyi zorunlu kılar.
>
> - **2024:** Minimum API 34 (Android 14)
> - **2025:** Muhtemelen API 35
>
> Eski targetSdk ile uygulama güncellenemez!

### Version Artırma Stratejisi

```
versionCode: 1, 2, 3, 4, ... (her release'de +1)
versionName: "1.0.0", "1.0.1", "1.1.0", "2.0.0" (semantic versioning)
```

**Örnek:**

- `1.0.0` → `1.0.1` (bug fix)
- `1.0.1` → `1.1.0` (yeni özellik)
- `1.1.0` → `2.0.0` (breaking change)

---

## CI/CD Entegrasyonu 🔄

### GitHub Actions Örneği

```yaml
# .github/workflows/android-release.yml
name: Android Release

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Decode Keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/my-upload-key.keystore

      - name: Create gradle.properties
        run: |
          echo "MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore" >> android/gradle.properties
          echo "MYAPP_UPLOAD_KEY_ALIAS=${{ secrets.KEY_ALIAS }}" >> android/gradle.properties
          echo "MYAPP_UPLOAD_STORE_PASSWORD=${{ secrets.KEYSTORE_PASSWORD }}" >> android/gradle.properties
          echo "MYAPP_UPLOAD_KEY_PASSWORD=${{ secrets.KEY_PASSWORD }}" >> android/gradle.properties

      - name: Build AAB
        run: |
          cd android
          ./gradlew bundleRelease

      - name: Upload AAB
        uses: actions/upload-artifact@v4
        with:
          name: app-release.aab
          path: android/app/build/outputs/bundle/release/app-release.aab
```

### GitHub Secrets Ekleme

```bash
# Keystore'u base64'e çevir
base64 -i android/app/my-upload-key.keystore | pbcopy

# GitHub > Settings > Secrets > Actions > New repository secret
# KEYSTORE_BASE64: (paste)
# KEY_ALIAS: my-key-alias
# KEYSTORE_PASSWORD: your_password
# KEY_PASSWORD: your_password
```

---

## Troubleshooting 🔍

### Yaygın Hatalar

**Hata: "Failed to read key"**

```bash
# Çözüm: Şifreleri kontrol edin
keytool -list -v -keystore my-upload-key.keystore
```

**Hata: "Keystore was tampered with"**

```bash
# Çözüm: Keystore bozulmuş, yedekten geri yükleyin
```

**Hata: "Upload key not found"**

```bash
# Çözüm: gradle.properties dosyasını kontrol edin
cat android/gradle.properties
```

### Keystore Bilgilerini Görüntüleme

```bash
# Keystore içeriğini listele
keytool -list -v -keystore my-upload-key.keystore

# Alias'ları göster
keytool -list -keystore my-upload-key.keystore

# Sertifika detayları
keytool -list -v -keystore my-upload-key.keystore -alias my-key-alias
```

---

## Checklist: Production Release 📋

- [ ] Keystore oluşturuldu ve güvenli yerde saklandı
- [ ] Keystore şifreleri kaydedildi (password manager)
- [ ] `.gitignore`'a `*.keystore` eklendi
- [ ] `gradle.properties` konfigüre edildi
- [ ] `build.gradle` signing config eklendi
- [ ] `versionCode` ve `versionName` güncellendi
- [ ] ProGuard/R8 aktif (`minifyEnabled true`)
- [ ] Release AAB/APK build edildi
- [ ] İmza doğrulandı (`jarsigner -verify`)
- [ ] Test cihazında çalıştırıldı
- [ ] Google Play Console'da uygulama oluşturuldu
- [ ] App Signing by Google Play aktif
- [ ] AAB upload edildi
- [ ] Release notes eklendi

---

## Güvenlik Best Practices 🔐

1. **Keystore Güvenliği:**
   - Asla Git'e commit etmeyin
   - Birden fazla yerde yedekleyin
   - Şifreli cloud storage kullanın

2. **Şifre Yönetimi:**
   - Güçlü şifreler kullanın (16+ karakter)
   - Password manager kullanın
   - Şifreleri kimseyle paylaşmayın

3. **CI/CD:**
   - Secrets'ı environment variables olarak saklayın
   - Base64 encode edin
   - Logs'da şifreleri expose etmeyin

4. **Google Play App Signing:**
   - Mutlaka aktif edin
   - Upload key ile signing key ayrı olsun
   - Keystore kaybı riskini minimize edin

---

## Eksik Kritik Konular ⚠️

### SHA-256 Fingerprint (Firebase/Google Services İçin)

Firebase, Google Sign-In, Google Maps kullanıyorsanız **mutlaka** gerekli:

```bash
# Release keystore'un SHA-256 fingerprint'ini alın
keytool -list -v -keystore android/app/my-upload-key.keystore -alias my-key-alias

# Çıktıda şunu arayın:
# SHA256: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:...
```

**Firebase Console'a Ekleme:**

1. Firebase Console → Project Settings → Your apps
2. Android app seçin
3. **Add fingerprint** → SHA-256'yı yapıştırın
4. `google-services.json` dosyasını yeniden indirin
5. `android/app/google-services.json` dosyasını güncelleyin

> [!IMPORTANT]
> **Debug ve Release için ayrı fingerprint'ler:**
>
> - Debug: `~/.android/debug.keystore` (otomatik)
> - Release: `my-upload-key.keystore` (sizin oluşturduğunuz)
>
> **Her ikisini de** Firebase'e eklemelisiniz!

### 64-bit Gereksinimi (2019'dan beri zorunlu)

Google Play, 64-bit desteği **zorunlu** kılmıştır:

**android/app/build.gradle:**

```gradle
android {
    defaultConfig {
        ...
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
    }

    // Split APKs (önerilen)
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a"
            universalApk false
            enable gradle.startParameter.taskNames.any { it.contains("Release") }
        }
    }
}
```

**Kontrol:**

```bash
# AAB içeriğini kontrol et
unzip -l android/app/build/outputs/bundle/release/app-release.aab | grep "lib/"

# Şunları görmeli:
# lib/arm64-v8a/    ← 64-bit ARM (zorunlu!)
# lib/armeabi-v7a/  ← 32-bit ARM
```

### Internal Testing Track (İlk Upload İçin)

**Production'a direkt yükleme yapmamalısınız!**

**Doğru Süreç:**

1. **Internal Testing** → Takım içi test (20 kişiye kadar)
2. **Closed Testing** → Beta testerlar (sınırsız)
3. **Open Testing** → Herkese açık beta
4. **Production** → Canlı yayın

**Internal Testing Kurulumu:**

```
Play Console → Testing → Internal testing
→ Create new release
→ Upload AAB
→ Testers → Create email list
→ Add emails (max 100)
→ Save → Review release → Start rollout
```

**Test Linki:**

```
https://play.google.com/apps/internaltest/XXXXXXXX
```

### App Size Optimization

**AAB Boyutunu Küçültme:**

```gradle
// android/app/build.gradle
android {
    buildTypes {
        release {
            // R8 full mode (daha agresif)
            minifyEnabled true
            shrinkResources true

            // Proguard optimization
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    // Unused resources'ları kaldır
    packagingOptions {
        exclude 'META-INF/*.kotlin_module'
        exclude '**/kotlin/**'
        exclude '**/*.txt'
        exclude '**/*.version'
        exclude '**/*.properties'
    }
}
```

**Hermes Engine (React Native 0.70+):**

```javascript
// android/app/build.gradle
project.ext.react = [
    enableHermes: true  // Varsayılan olarak true
]
```

**Boyut Analizi:**

```bash
# AAB boyutunu analiz et
bundletool get-size total \
  --bundle=android/app/build/outputs/bundle/release/app-release.aab

# APK boyutunu göster
ls -lh android/app/build/outputs/apk/release/app-release.apk
```

### Keystore Kaybı Durumunda

**Eğer keystore'u kaybettiyseniz:**

1. **Google Play App Signing aktifse:**
   - ✅ Upload key'i yenileyebilirsiniz
   - Play Console → Setup → App signing → Request upload key reset
   - Google destek ekibi yardımcı olur

2. **Google Play App Signing aktif değilse:**
   - ❌ Uygulamanızı **asla** güncelleyemezsiniz
   - Yeni bir uygulama olarak yayınlamanız gerekir
   - Tüm kullanıcıları, yorumları, indirmeleri kaybedersiniz

> [!CAUTION]
> **Bu yüzden Google Play App Signing MUTLAKA aktif olmalı!**

### Store Listing Gereksinimleri

**Minimum Gereksinimler:**

- **App icon:** 512x512px (PNG, 32-bit)
- **Feature graphic:** 1024x500px
- **Screenshots:** En az 2 adet
  - Phone: 320-3840px (16:9 veya 9:16)
  - 7-inch tablet: 1024-7680px
  - 10-inch tablet: 1024-7680px

**Privacy Policy:**

- Eğer hassas veri topluyorsanız **zorunlu**
- URL olarak sağlanmalı
- GDPR/KVKK uyumlu olmalı

**Content Rating:**

- IARC anketi doldurulmalı
- Yaş sınırı belirlenir
- Tüm ülkeler için geçerli

### Data Safety Form (ZORUNLU!)

> [!CAUTION]
> **Google Play Console'da "Data Safety" formu doldurulmadan release oluşturamazsınız!**

**Nasıl Doldurulur:**

1. Play Console → **App content** → **Data safety**
2. **Start** → Anketi doldurun

**Dikkat Edilmesi Gerekenler:**

- Firebase Analytics: **Evet, veri topluyoruz**
- AdMob: **Evet, reklam ID topluyoruz**
- Crash reporting: **Evet, crash logs topluyoruz**

### API 33+ Yeni Gereksinimler (Android 13+)

> [!IMPORTANT]
> **targetSdkVersion 33+** kullanıyorsanız yeni zorunluluklar var!

**1. Notification Permission (ZORUNLU):**

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    ...
</manifest>
```

**React Native'de runtime permission:**

```javascript
import { PermissionsAndroid, Platform } from "react-native";

async function requestNotificationPermission() {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}
```

**2. Foreground Service Types:**

```xml
<!-- Eğer foreground service kullanıyorsanız -->
<service
    android:name=".MyForegroundService"
    android:foregroundServiceType="location|camera|microphone" />
```

> [!WARNING]
> API 33+ için notification permission **zorunlu**. Eklemezsaniz bildirimler çalışmaz!

---

## Ek Troubleshooting 🔧

### Assets/Görseller Görünmüyor

**Sorun:** Release APK'da görseller veya fontlar yüklenmiyor.

**Çözüm:**

```bash
# Manuel bundle oluştur
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# Sonra build
cd android && ./gradlew assembleRelease
```

### INSTALL_FAILED_UPDATE_INCOMPATIBLE

**Sorun:** Farklı imza ile imzalanmış eski uygulama yüklü.

**Çözüm:**

```bash
# Eski uygulamayı kaldır
adb uninstall com.yourapp

# Yeni APK'yı yükle
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Execution failed for task ':app:validateSigningRelease'

**Sorun:** Keystore bulunamıyor veya şifre yanlış.

**Kontrol:**

```bash
# Dosya var mı?
ls -la android/app/my-upload-key.keystore

# Şifre doğru mu?
keytool -list -keystore android/app/my-upload-key.keystore

# gradle.properties doğru mu?
cat ~/.gradle/gradle.properties
```

**Yaygın Hata:**

```properties
# ✅ DOĞRU
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore

# ❌ YANLIŞ
MYAPP_UPLOAD_STORE_FILE=android/app/my-upload-key.keystore
```

### INSTALL_PARSE_FAILED_NO_CERTIFICATES

**Sorun:** APK imzalanmamış.

**Çözüm:**

```bash
apksigner verify --verbose app-release.apk
```

---

## Hızlı Referans 🚀

| Komut                                   | Açıklama         |
| --------------------------------------- | ---------------- |
| `./gradlew bundleRelease`               | AAB oluştur      |
| `./gradlew assembleRelease`             | APK oluştur      |
| `./gradlew clean`                       | Cache temizle    |
| `keytool -list -v -keystore x.keystore` | Keystore bilgisi |
| `apksigner verify app.apk`              | İmza doğrula     |
| `adb install app.apk`                   | Cihaza yükle     |

**Dosya Yolları:**

- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## Final Checklist 📋

**Release Öncesi:**

- [ ] Keystore 3 yerde yedeklendi
- [ ] `targetSdkVersion` güncel (2024: API 34)
- [ ] 64-bit support (`arm64-v8a`)
- [ ] V3/V4 signing aktif (`enableV3Signing`, `enableV4Signing`)
- [ ] API 33+ notification permission eklendi (gerekirse)
- [ ] İmza doğrulandı
- [ ] Gerçek cihazda test edildi

**Google Play:**

- [ ] **App Signing MUTLAKA aktif** (2025'te zorunlu!)
- [ ] Data Safety formu dolduruldu
- [ ] Internal testing yapıldı
- [ ] SHA-256 Firebase'e eklendi (gerekirse)

---

## Uygulama Satışı/Devir Süreci 🔄

### Keystore Nasıl Üretiliyor?

> [!NOTE]
> **Keystore üreten araç: `keytool`**
>
> - Java JDK ile birlikte gelir (built-in)
> - Başka alternatif araç yok, bu resmi yöntem
> - Android Studio'da GUI var ama komut satırı daha güvenilir

**keytool Nedir?**

- Java Development Kit (JDK) içinde gelen bir komut satırı aracı
- Dijital sertifika ve keystore yönetimi için kullanılır
- Tüm platformlarda aynı şekilde çalışır (Windows, macOS, Linux)

**Kurulum:**

```bash
# JDK kurulu mu kontrol et
java -version
keytool -version

# Kurulu değilse:
# macOS: brew install openjdk@17
# Windows: Oracle JDK veya Adoptium
# Linux: sudo apt install openjdk-17-jdk
```

**Android Studio GUI (Alternatif):**

1. Build → Generate Signed Bundle/APK
2. Create new keystore
3. Bilgileri doldur
4. Keystore oluşturulur

> [!TIP]
> Komut satırı yöntemi daha güvenilir ve otomasyon için uygun!

---

### Uygulama Satışı/Devir Süreci

**Senaryo:** "Expense Tracker" uygulamanızı başka bir geliştiriciye satıyorsunuz.

#### Adım 1: Keystore Transferi

**Verilmesi Gerekenler:**

```bash
# 1. Keystore dosyası
expense-tracker-upload-key.keystore

# 2. Keystore bilgileri (güvenli şekilde paylaş)
Keystore Password: ********
Key Alias: expense-tracker-key
Key Password: ********
```

**Güvenli Transfer Yöntemleri:**

```bash
# Seçenek 1: Şifreli ZIP
zip -e keystore-package.zip expense-tracker-upload-key.keystore keystore-info.txt
# Şifreyi ayrı kanaldan paylaş (SMS, telefon)

# Seçenek 2: Password Manager
# 1Password, Bitwarden gibi araçlarla güvenli paylaşım

# Seçenek 3: Şifreli Cloud Storage
# Google Drive (şifreli), Dropbox (şifreli)
```

> [!CAUTION]
> **Asla email ile şifresiz göndermeyin!**

---

#### Adım 2: Google Play Console Transfer

**Play Console'da Transfer:**

1. **Play Console** → **Settings** → **Developer account**
2. **Transfer apps** seçeneğini bul
3. Alıcının email adresini ekle
4. Transfer isteği gönder
5. Alıcı kabul eder

**Alternatif: Developer Account Değişikliği**

Eğer tam devir yapılacaksa:

1. Play Console → **Users and permissions**
2. Yeni sahibi **Admin** olarak ekle
3. Kendini **kaldır** (veya yetkilerini düşür)

---

#### Adım 3: Devir Sonrası Kontrol Listesi

**Alıcının Yapması Gerekenler:**

- [ ] Keystore dosyasını güvenli yere kaydet
- [ ] Şifreleri password manager'a ekle
- [ ] Test build al (imza doğrula)
- [ ] Google Play Console erişimini kontrol et
- [ ] Firebase/Analytics hesaplarını devral (gerekirse)
- [ ] App Store listing'i güncelle (gerekirse)

**Satıcının Yapması Gerekenler:**

- [ ] Keystore'u yedekten sil (artık senin değil!)
- [ ] Şifreleri password manager'dan kaldır
- [ ] Play Console erişimini kaldır
- [ ] Firebase/Analytics erişimini kaldır
- [ ] Kaynak kodunu devret (anlaşmaya göre)

---

### Keystore Güvenliği (Satış Öncesi)

**Satış Öncesi Hazırlık:**

```bash
# 1. Keystore bilgilerini dokümante et
cat > transfer-package/README.txt << EOF
App Name: Expense Tracker
Package: com.yourcompany.expensetracker
Keystore File: expense-tracker-upload-key.keystore
Alias: expense-tracker-key
Created: 2024-01-15
Last Used: 2024-12-20

IMPORTANT:
- This keystore is CRITICAL for app updates
- Store passwords in a password manager
- Keep 3 backups in different locations
- Never commit to Git
EOF

# 2. Keystore'u test et
keytool -list -v -keystore expense-tracker-upload-key.keystore

# 3. Son bir release build al (doğrulama için)
cd android && ./gradlew bundleRelease
```

**Transfer Paketi:**

```
transfer-package/
├── expense-tracker-upload-key.keystore
├── keystore-info.txt (şifreler)
├── README.txt (talimatlar)
├── last-release.aab (son build)
└── SHA-256-fingerprint.txt (Firebase için)
```

---

### Yasal Hususlar

> [!WARNING]
> **Satış Sözleşmesinde Bulunması Gerekenler:**
>
> - Keystore'un mülkiyeti alıcıya geçer
> - Satıcı keystore'u silmeyi taahhüt eder
> - Uygulama güncellemelerini sadece alıcı yapabilir
> - Google Play Console erişimi devredilir
> - Kaynak kodu devri (varsa)

**Örnek Madde:**

```
"Satıcı, [App Name] uygulamasının Android keystore dosyasını,
ilgili şifreleri ve Google Play Console erişimini alıcıya
devretmeyi kabul eder. Satıcı, devir sonrası keystore'u
silmeyi ve uygulamayı güncellememyi taahhüt eder."
```

---

## Kaynaklar 📚

- [Android Developer - App Signing](https://developer.android.com/studio/publish/app-signing)
- [React Native - Publishing to Google Play](https://reactnative.dev/docs/signed-apk-android)
- [Google Play Console](https://play.google.com/console)
- [bundletool](https://github.com/google/bundletool)

---

> **💡 Pro Tip:** Keystore'unuzu kaybetmek, uygulamanızı kaybetmek demektir. **Mutlaka yedekleyin!**
