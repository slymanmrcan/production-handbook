# Google Play Console

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

