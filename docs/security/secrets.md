# Secret Yönetimi (Şifre Saklama) 🔑

Uygulamalarınızın içinde veritabanı şifresi, API anahtarı veya Secret Key gibi hassas verileri **ASLA** kodun içine (Hardcoded) yazmamalısınız. Kodunuzu GitHub'a attığınız an o şifreler ifşa olur.

İşte bu şifreleri güvenli bir şekilde yönetmenin yolları.

## 1. Yöntem: `.env` Dosyası (En Pratik) ✅

Çoğu proje (Node.js, Python, PHP, Docker) için standart yöntem budur. Şifreler proje klasöründe `.env` adında gizli bir dosyada tutulur.

### Nasıl Yapılır?

1.  Proje dizininde `.env` dosyasını oluşturun:

    ```bash
    nano .env
    ```

2.  İçine hassas verilerinizi yazın:

    ```properties
    DB_HOST=localhost
    DB_USER=admin
    DB_PASSWORD=cok_gizli_sifre_burada
    JWT_SECRET=ozel_uretilen_hash_degeri
    API_KEY=x8s7ad7sa8d7s8d7a8s
    ```

### Güvenli Hale Getirme (Çok Önemli!) 🛡️

Bu dosyanın sadece sizin tarafınızdan okunabilmesi lazım. Diğer kullanıcılar okuyamasın.

```bash
# Sadece sahibi okuyup yazabilsin (600)
chmod 600 .env

# Sahipliğini garantiye al
sudo chown $USER:$USER .env
```

### Git'ten Uzak Tutma 🚫

Bu dosyanın yanlışlıkla GitHub'a gitmemesi için `.gitignore` dosyasına ekleyin:

```bash
echo ".env" >> .gitignore
```

---

## 2. Yöntem: Docker Secrets (Konteynerler İçin) 🐳

Eğer Docker Compose kullanıyorsanız, şifreleri çevre değişkeni (Environment Variable) yerine dosya olarak mount etmek daha güvenlidir.

**docker-compose.yml örneği:**

```yaml
services:
  app:
    image: my-app
    secrets:
      - db_password
      - api_token

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_token:
    file: ./secrets/api_token.txt
```

Bu yöntemde şifreler konteynerin içine `/run/secrets/db_password` dosyası olarak salt okunur (read-only) bağlanır. Uygulamanız şifreyi bu dosyadan okur.

---

## 3. Güçlü Şifre Üretme Araçları 🎲

"Ali123" gibi şifreler kullanmayın. Terminalden kriptografik olarak güvenli rastgele şifreler üretin.

### OpenSSL ile (Önerilen)

```bash
# 32 karakterlik base64 şifre (JWT Secret için ideal)
openssl rand -base64 32
# Çıktı: K7xP9mN2vQ8wR4tY6uI0oL3jH5gF1dS7aZ9xC2bV4nM=
```

### Çoklu Üretim

```bash
# 5 tane üret
for i in {1..5}; do openssl rand -base64 24; done
```

---

## 4. Neden HashiCorp Vault Değil? 🤔

**HashiCorp Vault** veya **AWS Secrets Manager** gibi araçlar çok güçlüdür ancak kurulumu ve bakımı zordur ("Overkill").

| Yöntem              | Karmaşıklık | Güvenlik     | Uygun Senaryo                  |
| :------------------ | :---------- | :----------- | :----------------------------- |
| **Hardcoded**       | Çok Düşük   | ❌ Yok       | Asla kullanma                  |
| **.env Dosyası**    | Düşük       | ✅ İyi       | Tek sunucu, küçük/orta proje   |
| **Docker Secrets**  | Orta        | ✅✅ Çok İyi | Docker Swarm / Kubernetes      |
| **HashiCorp Vault** | Çok Yüksek  | 🏆 Mükemmel  | Bankalar, Dev Kurumsal Yapılar |

**Özet:** Tek bir sunucu veya startup projesi için `.env` + `chmod 600` fazlasıyla yeterlidir.

---

## 5. Ekip Çalışması ve Ortamlar 🤝

Projede yalnız değilseniz veya farklı sunucular (Test, Prod) yönetiyorsanız:

### 📝 .env.example Oluşturun

Gerçek şifrelerin olmadığı bir şablon dosyası oluşturun ve Git'e gönderin. Yeni gelen geliştirici neye ihtiyacı olduğunu anlasın.

```bash
# .env.example (Git'e eklenir - İÇİ BOŞ OLSUN!)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
JWT_SECRET=
API_KEY=
```

Kullanım:

```bash
cp .env.example .env
nano .env  # Kendi şifrelerini yazar
```

### 🌍 Ortamları Ayırın

- `.env.development` (Lokal - Git'e girmez)
- `.env.production` (Canlı Sunucu - Git'e girmez, Çok güvenli!)
- `.gitignore` ayarı:
  ```bash
  echo -e ".env\n.env.*\n!.env.example" >> .gitignore
  ```

---

## 6. Kritik Hata: Şifreyi Yanlışlıkla Git'e Attım! 🚨

Sadece dosyayı silip yeni commit atmak **YETMEZ!** Git geçmişinde o şifre sonsuza kadar saklanır.

**Adım 1: Şifreyi hemen değiştirin** (En garanti çözüm budur).

**Adım 2: Git Geçmişini Temizleyin (Opsiyonel ama önerilir)**

Eğer history temizlemek zorundaysanız `BFG Repo-Cleaner` kullanın:

```bash
# .env dosyasını tarihten sil
bfg --delete-files .env

# Git referanslarını temizle ve zorla gönder
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

---

## 7. İleri Seviye Güvenlik Riskleri 🕵️‍♂️

### 📋 Loglara Şifre Yazma Hatası

Kod yazarken dikkatli olun. Şifreyi loglamayın!

```python
# ❌ YANLIŞ: Şifre log dosyasına açık metin yazılır
logger.info(f"Bağlanılıyor: {DB_USER}:{DB_PASSWORD}")

# ✅ DOĞRU: Maskeleme yapın
logger.info(f"Bağlanılıyor: {DB_USER}:****")
```

### 🔍 Systemd Servislerinde Şifre

Servis dosyasının içine (`Environment=ŞİFRE`) yazmayın. `ps aux` komutunda görünebilir. Bunun yerine dosya kullanın:

```ini
# /etc/systemd/system/myapp.service
[Service]
EnvironmentFile=/etc/myapp/env
User=appuser
```

Ve dosya izinlerini kısıtlayın:

```bash
sudo chown root:root /etc/myapp/env
sudo chmod 600 /etc/myapp/env
```

---

## 8. Ekstra İpuçları (Opsiyonel) 💡

### 🔄 Şifre Rotasyonu

Kritik şifreleri sonsuza kadar kullanmayın. Belirli aralıklarla değiştirin:

- **API Key:** 90 Günde bir.
- **Veritabanı Şifresi:** 6 Ayda bir.
- **JWT Secret:** Yılda bir (Dikkat: Değişince kullanıcıların oturumu düşer).

### 🔍 Process Environment Riski (İleri Seviye)

Aynı kullanıcı adıyla çalışan işlemler, birbirlerinin çevre değişkenlerini (env) okuyabilir.

```bash
# Bir process'in env değerlerini okuma:
cat /proc/<PID>/environ | tr '\0' '\n'
```

**Çözüm:** Uygulamayı her zaman kendine ait bir kullanıcı (örn: `appuser`) ile çalıştırın.

---

## 8. Piyasadaki Diğer Alternatifler (Gelişmiş Senaryolar) 🌍

Eğer projeniz büyürse veya `env` dosyasıyla uğraşmak istemezseniz, şu araçlara bakabilirsiniz:

| Araç                     | Tür              | Özellik                                                     | Kullanım Önerisi                                                    |
| :----------------------- | :--------------- | :---------------------------------------------------------- | :------------------------------------------------------------------ |
| **HashiCorp Vault**      | 🏢 Enterprise    | Endüstri standardı. Çok karmaşık ama her şeyi yapar.        | Büyük bankalar, Dev şirketler.                                      |
| **Infisical**            | 🚀 Startup Dostu | Açık kaynaklı, Vault'un **çok daha kolay** hali.            | Modern Yazılım Ekipleri (Şiddetle Önerilir).                        |
| **Bitwarden Secrets**    | 🔓 Açık Kaynak   | Parola yöneticisi Bitwarden'ın DevOps versiyonu. Güvenilir. | Kişisel / Küçük Ekipler.                                            |
| **AWS / Google Secrets** | ☁️ Cloud Native  | Bulut sağlayıcınızın kendi servisi. Pahalı olabilir.        | Full AWS/GCP üzerindeki projeler.                                   |
| **Yandex Lockbox**       | 🇷🇺 Rusya Menşeli | Yandex Cloud'un servisi. HashiCorp alternatifi.             | Yandex Cloud kullananlar. _(Not: Veri gizliliği endişesi olabilir)_ |

> **💡 Tavsiye:** Eğer `.env` yetmiyor ama Vault çok ağır geliyorsa, **Infisical** veya **Bitwarden**'a göz atın. Hem güvenli hem pratiklerdir.
