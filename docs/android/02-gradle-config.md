# Gradle Konfigürasyonu


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

