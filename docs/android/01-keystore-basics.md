# Keystore Temelleri

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

# keytool komutu JDK ile gelir, yardımı görerek kontrol edebilirsiniz
keytool -help
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
