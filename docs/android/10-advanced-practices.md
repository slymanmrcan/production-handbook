# İleri Seviye DevOps Pratikleri 🚀

Fastlane ve CI/CD kurulumunu tamamladıysanız, sürecinizi bir üst seviyeye taşıyacak "Büyücülük" seviyesindeki araçlar şunlardır.

## 1. CodePush (Hot Updates) ⚡️

React Native'in en büyük süper gücüdür. JavaScript ve Asset (resim vb.) değişikliklerini, Google Play / App Store incelemesine sokmadan **direkt kullanıcının cihazına** göndermenizi sağlar.

**Ne Zaman Kullanılır?**

- Kritik bugfix'ler
- UI/UX düzeltmeleri
- Metin güncellemeleri

**Ne Zaman KULLANILMAZ?**

- Native kod değişikliği yaptıysanız (`npm install` ile native library eklediyseniz veya `android/` klasöründe değişiklik yaptıysanız). Bu durumda normal Store güncellemesi şarttır.

### Kurulum (Microsoft App Center)

1.  `npm install react-native-code-push`
2.  App Center hesabı oluşturun ve uygulama ekleyin.
3.  `App.js` dosyanızı sarın:

```javascript
import codePush from "react-native-code-push";

let codePushOptions = { checkFrequency: codePush.CheckFrequency.ON_APP_RESUME };

class App extends Component {
  // ...
}

export default codePush(codePushOptions)(App);
```

### Fastlane ile CodePush

Fastlane ile CodePush da otomatize edilebilir:

```ruby
lane :hotfix do
  # JS Bundle'ı App Center'a (CodePush) gönder
  appcenter_codepush_release_react(
    api_token: "YOUR_TOKEN",
    owner_name: "YOUR_ORG",
    app_name: "YOUR_APP",
    deployment: "Production"
  )
end
```

---

## 2. Firebase App Distribution (Hızlı QA) 🧪

Google Play Internal Track bazen işlemesi saatler sürer. Test ekibine (QA) veya şirket içi testerlara anında (saniyeler içinde) APK dağıtmak için **Firebase App Distribution** en iyi çözümdür.

### Avantajları

- 🚀 Anında dağıtım (Upload biter bitmez bildirim gider)
- 📩 Testerlara email bildirimi
- 📊 Kim indirdi, kim test etti takibi

### Fastlane Entegrasyonu

Önce plugin'i kurun:
`fastlane add_plugin firebase_app_distribution`

`Fastfile`:

```ruby
lane :beta do
  # Debug veya Beta build al
  gradle(task: "assembleRelease")

  # Firebase'e yükle
  firebase_app_distribution(
    app: "1:1234567890:android:xxxxxx", # Firebase App ID
    groups: "qa-team, developers",       # Tester grupları
    release_notes: "Yeni login ekranı düzeltildi."
  )
end
```

---

## 3. Otomatik İkon Badge'leme 🏷️

Geliştirme (Dev) veya Beta sürümlerini, Production sürümünden ayırmak için ikonların üzerine otomatik "BETA" veya versiyon numarası basabilirsiniz.

**Gereksinim:** `brew install graphicsmagick`

Plugin: `fastlane add_plugin badge`

`Fastfile`:

```ruby
lane :beta do
  # İkonun üzerine "BETA" ve versiyon "1.0.3" yazar
  add_badge(dark: true)

  gradle(task: "assembleRelease")

  # Release sonrası ikonları temizle (orijinale dön)
  sh "git checkout -- android/app/src/main/res/mipmap-*"
end
```

Bu işlem sonucunda testerlar telefonlarında uygulamanın ikonunu şöyle görürler:

> 📱 **Uygulama İkonu** + Üzerinde **"1.0 BETA"** etiketi.

---

## Efsanevi Workflow Örneği 🏆

Tüm bu araçları birleştiren ideal bir workflow şöyledir:

1.  **Kod Pushlanır (GitHub):**
    - CI Server (GitHub Actions) tetiklenir.
    - Testler (`npm test`) koşar.

2.  **Nightly/Beta Build (Her Gece veya Merge Sonrası):**
    - `fastlane beta` çalışır.
    - **Badge:** İkona versiyon basılır.
    - **Build:** APK oluşturulur.
    - **Distribution:** Firebase App Distribution ile QA ekibine gönderilir.

3.  **Production Release (Tag atıldığında):**
    - `fastlane production` çalışır.
    - **Build:** AAB oluşturulur (badgesiz, temiz ikon).
    - **Upload:** Google Play Console (Internal Track) yüklenir.
    - **Notify:** Slack'ten "Yayına hazır!" mesajı atılır.

4.  **Hotfix (Acil Durum):**
    - `fastlane hotfix` çalışır.
    - CodePush ile JS bundle güncellenir.
    - Kullanıcılar uygulamayı kapatıp açtığında güncellemeyi alır.
