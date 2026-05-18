# CI/CD Pipeline'ları 🔄

Sürekli entegrasyon ve dağıtım (CI/CD), her kod değişikliğinde testlerin çalışmasını ve onaylanan kodun otomatik olarak mağazaya yüklenmesini sağlar.

## 1. Environment Variables (Secrets)

Pipeline'larınızın çalışması için aşağıdaki değişkenleri CI/CD sağlayıcınızın **Secrets** bölümüne eklemelisiniz.

| Secret Adı          | Değer                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| `KEYSTORE_BASE64`   | `my-upload-key.keystore` dosyasının Base64 hali (`base64 -i file.keystore`) |
| `KEY_ALIAS`         | Keystore alias adı                                                          |
| `KEYSTORE_PASSWORD` | Keystore şifresi                                                            |
| `KEY_PASSWORD`      | Key şifresi                                                                 |
| `PLAY_CONFIG_JSON`  | Google Service Account JSON içeriği (Fastlane için)                         |

## 2. GitHub Actions Workflow

`.github/workflows/android-deploy.yml`:

```yaml
name: Android Deploy
on:
  push:
    tags:
      - "v*" # v1.0.0 gibi tag atıldığında çalışır

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: "zulu"
          java-version: "17"

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      # 1. Keystore Dosyasını Oluştur
      - name: Decode Keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/my-upload-key.keystore

      # 2. Fastlane Kurulumu
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.0"
          bundler-cache: true
          working-directory: "android"

      # 3. Google Play JSON Key Oluştur
      - name: Create Google Play JSON
        run: |
          echo '${{ secrets.PLAY_CONFIG_JSON }}' > android/fastlane/api-key.json

      # 4. Fastlane ile Deploy
      - name: Deploy to Play Store Internal
        run: |
          cd android
          bundle exec fastlane internal
        env:
          MYAPP_UPLOAD_STORE_FILE: "my-upload-key.keystore"
          MYAPP_UPLOAD_STORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          MYAPP_UPLOAD_KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          MYAPP_UPLOAD_KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
```

## 3. GitLab CI/CD

`.gitlab-ci.yml`:

```yaml
image: reactnativecommunity/react-native-android:latest

stages:
  - deploy

deploy_internal:
  stage: deploy
  only:
    - tags
  before_script:
    - npm ci
    # Keystore Decode
    - echo $KEYSTORE_BASE64 | base64 -d > android/app/my-upload-key.keystore
    # Google Play JSON
    - echo $PLAY_CONFIG_JSON > android/fastlane/api-key.json
  script:
    - cd android
    - bundle install
    - bundle exec fastlane internal
  variables:
    MYAPP_UPLOAD_STORE_FILE: "my-upload-key.keystore"
    # Diğer değişkenler GitLab CI/CD Variables sekmesinden gelir
```

> [!WARNING]
> **Güvenlik Uyarısı:** Loglarda şifrelerin görünmediğinden emin olun. GitHub Actions ve GitLab CI, secret olarak tanımlanan değişkenleri otomatik olarak maskeler (\*\*\*), ancak `echo` ile yazdırmamaya dikkat edin.
