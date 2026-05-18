# Android Publishing Guide

> [!NOTE]
> Bu bölüm, React Native Android uygulamalarını Google Play Store ve alternatif platformlara yayınlama sürecini kapsar.

## 📚 İçindekiler

### [1. Keystore Temelleri](01-keystore-basics.md)

- Keystore nedir?
- Tek vs Çoklu keystore stratejisi
- Keystore oluşturma
- Güvenli saklama

### [2. Gradle Konfigürasyonu](02-gradle-config.md)

- Signing configs
- ProGuard/R8 rules
- Hibrit yaklaşım (Env Vars + gradle.properties)

### [3. Build ve Release](03-build-release.md)

- AAB vs APK
- Release build alma
- Alternatif dağıtım kanalları (F-Droid, GitHub Releases)
- Dağıtım stratejisi

### [4. Google Play Console](04-google-play.md)

- App Signing by Google Play
- Upload Key vs Signing Key
- Version yönetimi
- Store listing gereksinimleri
- Data Safety formu

### [5. Troubleshooting](05-troubleshooting.md)

- Yaygın hatalar ve çözümler
- İmza doğrulama
- Assets/görseller sorunu
- Hızlı referans

### [6. Uygulama Satışı/Devir](06-app-transfer.md)

- Keystore transferi
- Google Play Console transfer
- Yasal hususlar
- Devir sonrası checklist

### [7. Fastlane Otomasyonu](07-fastlane-automation.md)

- Kurulum ve Service Account
- `Fastfile` konfigürasyonu
- Tek komutla deploy (`fastlane internal`)

### [8. CI/CD Pipeline'ları](08-ci-cd-pipelines.md)

- GitHub Actions workflow
- GitLab CI/CD
- Secrets yönetimi

### [9. Release Sonrası Monitoring](09-post-release-monitoring.md)

- Firebase Crashlytics & Mapping Files
- Google Play Vitals (ANR & Crash rate)
- Performans izleme

### [10. İleri Seviye Pratikler](10-advanced-practices.md) 🚀

- **CodePush:** Store onayı beklemeden hot-update
- **Firebase App Distribution:** Hızlı QA dağıtımı
- **Auto Badging:** İkonlara versiyon numarası basma

---

## 🚀 Hızlı Başlangıç

**İlk kez yayınlıyorsanız:**

1. [Keystore oluşturun](01-keystore-basics.md#keystore-olusturma)
2. [Gradle'ı yapılandırın](02-gradle-config.md)
3. [Release build alın](03-build-release.md)
4. [Google Play'e yükleyin](04-google-play.md)

**Sorun mu yaşıyorsunuz?**

- [Troubleshooting](05-troubleshooting.md) bölümüne bakın
- [Hızlı Referans](05-troubleshooting.md#hizli-referans) kartını kullanın

---

> **💡 Pro Tip:** Her uygulama için ayrı keystore kullanın!
