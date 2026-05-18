# Fastlane ile Deployment Otomasyonu 🤖

Manuel build almak ve Play Console'a dosya sürüklemek yerine, **Fastlane** kullanarak tüm süreci tek komuta indirebilirsiniz.

## 1. Kurulum

Fastlane, Ruby tabanlıdır. Projenizin kök dizininde (react-native projesi root'u):

```bash
# Gemfile oluştur
bundle init

# Gemfile içine ekle:
# gem "fastlane"

# Yükle
bundle install
```

## 2. Fastlane Başlatma

Android klasörüne gidin ve init yapın:

```bash
cd android
bundle exec fastlane init
```

Size paket adını soracak ve `android/fastlane` klasörünü oluşturacaktır.

## 3. Google Play API Erişimi (Service Account)

Fastlane'in Google Play'e dosya yükleyebilmesi için bir **Service Account JSON** dosyasına ihtiyacı var.

1.  **Google Cloud Console**'u açın.
2.  **IAM & Admin** > **Service Accounts** > **Create Service Account**.
3.  Role olarak **Service Account User** verin.
4.  Oluşturulan hesaba tıklayın > **Keys** > **Add Key** > **Create New Key** > **JSON**.
5.  Dosyayı indirin ve projenizde `android/fastlane/api-key.json` olarak kaydedin. (Bunu `.gitignore`'a ekleyin!)
6.  **Google Play Console** > **Users and permissions** sayfasından bu email adresini davet edin ve **Admin** (veya Release Manager) yetkisi verin.

## 4. Fastfile Konfigürasyonu

`android/fastlane/Fastfile` dosyasını düzenleyin:

```ruby
default_platform(:android)

platform :android do
  desc "Build ve Google Play Internal Track'e yükle"
  lane :internal do
    # 1. Versiyon kodunu artır (Opsiyonel, plugin gerekir)
    # increment_version_code(gradle_file_path: "app/build.gradle")

    # 2. Temizle
    gradle(task: "clean")

    # 3. Release AAB al
    gradle(
      task: "bundle",
      build_type: "Release",
      properties: {
        "android.injected.signing.store.file" => ENV["MYAPP_UPLOAD_STORE_FILE"],
        "android.injected.signing.store.password" => ENV["MYAPP_UPLOAD_STORE_PASSWORD"],
        "android.injected.signing.key.alias" => ENV["MYAPP_UPLOAD_KEY_ALIAS"],
        "android.injected.signing.key.password" => ENV["MYAPP_UPLOAD_KEY_PASSWORD"],
      }
    )

    # 4. Google Play'e yükle
    upload_to_play_store(
      track: "internal",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      json_key: "fastlane/api-key.json",
      skip_upload_metadata: true, # Metadata/screenshot güncellemeyecekseniz true yapın (hız kazandırır)
      skip_upload_changelogs: true
    )

    # 5. Slack'e bildirim at (Opsiyonel)
    # slack(message: "Android Release başarıyla yüklendi! 🚀")
  end
end
```

## 5. Çalıştırma

Terminalden tek komutla deploy yapın:

```bash
cd android
bundle exec fastlane internal
```

> [!TIP]
> **Metadata Yönetimi:** Fastlane ile uygulamanın başlığını, açıklamasını ve ekran görüntülerini de yönetebilirsiniz. `fastlane supply init` komutu ile mevcut Play Store verilerini çekebilir, localde düzenleyip pushlayabilirsiniz.
