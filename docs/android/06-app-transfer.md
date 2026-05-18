# Uygulama Satışı ve Devir


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

