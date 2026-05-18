# Release Sonrası Monitoring 📊

Uygulamayı yayınladıktan sonra iş bitmez. Kullanıcıların yaşadığı çökme (crash) ve performans sorunlarını takip etmeniz gerekir.

## 1. Firebase Crashlytics & Mapping Files

ProGuard/R8 kullandığımız için (`minifyEnabled true`), hata logları "obfuscated" (okunamaz) halde gelir. Yani `MainComponent.java line 54` yerine `a.b.c line 1` görürsünüz. Bunu düzeltmek için **Mapping File** yüklemelisiniz.

### Gradle ile Otomatik Yükleme (Önerilen)

`android/app/build.gradle` dosyanızda Crashlytics plugin'inin kurulu olduğundan emin olun.

```gradle
// android/build.gradle (Project level)
dependencies {
    classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
}

// android/app/build.gradle (App level)
apply plugin: 'com.google.firebase.crashlytics'
```

Firebase Gradle eklentisi, release build sırasında mapping dosyasını **otomatik olarak** bulur ve yükler. Ancak bazen manuel tetiklemek gerekir:

```bash
./gradlew app:assembleRelease app:uploadCrashlyticsMappingFileRelease
```

### Fastlane ile Yükleme

Eğer Fastlane kullanıyorsanız, `Fastfile` içine ekleyebilirsiniz:

```ruby
lane :internal do
  # ... build adımları ...

  # AAB yükleme
  upload_to_play_store(...)

  # Mapping file yükleme (Firebase'e)
  upload_symbols_to_crashlytics(
    gsp_path: "app/google-services.json",
    binary_path: "app/build/intermediates/merged_native_libs/release/out/lib" # NDK kullanıyorsanız
  )
end
```

## 2. Google Play Vitals

Google Play Console > **Quality** > **Android Vitals** sekmesi, uygulamanızın sağlığını gösterir.

**Takip Etmeniz Gereken Kritik Metrikler:**

1.  **Crash rate:** %1.09'un altında olmalı. (Kötü davranış eşiği)
2.  **ANR rate (Application Not Responding):** %0.47'nin altında olmalı.

> [!TIP]
> **ANR Neden Olur?** UI thread'i 5 saniyeden fazla kilitlerseniz ANR hatası alırsınız. Genellikle ağır işlemleri (görsel işleme, büyük veri döngüleri) ana thread'de yapmaktan kaynaklanır.

## 3. Performans İzleme (Firebase Performance)

Kullanıcıların uygulama açılış süresini ve ağ isteklerinin hızını ölçmek için:

```bash
npm install @react-native-firebase/perf
```

JS tarafında özel trace'ler ekleyebilirsiniz:

```javascript
import perf from "@react-native-firebase/perf";

async function customTrace() {
  const trace = await perf().startTrace("custom_trace");

  // ... işlemler ...

  await trace.stop();
}
```
