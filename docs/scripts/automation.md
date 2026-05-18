# Otomasyon Rehberi: GitHub Actions 🤖

Sürekli sunucuya girip `git pull`, `docker compose up -d` yapmaktan yoruldunuz mu?
GitHub Actions ile "Push to Deploy" (Kodu at, sunucu güncellensin) yapısını kuralım.

## 1. Mantık Nedir?

1.  Bilgisayarınızda kodu düzenler ve `git push` yaparsınız.
2.  GitHub bunu görür ve **Action** (işçi) başlatır.
3.  GitHub'ın işçisi, sizin sunucunuza **SSH** ile bağlanır.
4.  Belirlediğiniz komutları (örn: `deploy.sh`) çalıştırır.

---

## 2. Hazırlık (Secrets) 🔐

Sunucu şifrenizi kodun içine (yml dosyasına) **ASLA** yazmayın. GitHub'ın "Secrets" kasasını kullanın.

1.  GitHub Reponuz -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.
2.  Şu bilgileri ekleyin:

| Secret Adı | Değer (Örnek)           | Açıklama                                  |
| :--------- | :---------------------- | :---------------------------------------- |
| `HOST_IP`  | `1.2.3.4`               | Sunucunuzun IP adresi.                    |
| `SSH_USER` | `deployer`              | Bağlanacak kullanıcı (root kullanmayın).  |
| `SSH_KEY`  | `-----BEGIN OPENSSH...` | Private Key'inizin (`id_ed25519`) tamamı. |

> **İpucu:** Private Key'i almak için: `cat ~/.ssh/id_ed25519` (Kendi bilgisayarınızdaki değil, sunucuya erişimi olan bir key olmalı. Genelde yeni bir key pair üretilip Public olan sunucuya, Private olan GitHub'a verilir.)

---

## 3. Workflow Dosyası (`.yml`) 📄

Reponuzda `.github/workflows/deploy.yml` dosyasını oluşturun ve yapıştırın:

```yaml
name: Deploy to Server 🚀

# Ne zaman çalışsın? (Sadece main branch'e push gelince)
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Pre-Flight Check (Uçuş Öncesi Kontrol) 🛡️
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST_IP }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          port: 2222
          script: |
            # 1. Disk Dolu mu? (>%90 ise Dur)
            if [ $(df / | awk 'NR==2 {print $5}' | tr -d %) -gt 90 ]; then
              echo "❌ DISK DOLU! Deploy iptal ediliyor."
              exit 1
            fi

            # 2. Docker çalışıyor mu?
            if ! systemctl is-active --quiet docker; then
               echo "❌ Docker çalışmıyor!"
               exit 1
            fi
            echo "✅ Sistem deploy için uygun."

      - name: Copy Files via SCP (Dosyaları Yükle)
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.HOST_IP }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          port: 2222
          source: "."
          target: "/home/${{ secrets.SSH_USER }}/app"

      - name: Execute Remote SSH (Komut Çalıştır)
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST_IP }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          port: 2222
          script: |
            echo "🚀 Deployment Basliyor..."
            cd /home/${{ secrets.SSH_USER }}/app

            # Sunucuda /usr/local/bin altinda tuttugunuz scriptlerin varligini kontrol et
            test -x /usr/local/bin/maintenance.sh

            # Docker containerlari yenile (Ornek)
            # docker compose down && docker compose up -d --build

            # Bakim scriptini calistir
            /usr/local/bin/maintenance.sh

            echo "✅ Deployment Tamamlandi!"
```

> **Not:** Bu repoda scriptler Markdown olarak dokümante edilir. `docs/scripts/library/*.md` içindeki kod bloklarını önce sunucuda `/usr/local/bin/*.sh` olarak oluşturup sonra CI içinde çağırın.

---

## 4. Kritik: Ne Yapılır, Ne Yapılmaz? (Do's & Don'ts) 🛑

GitHub Actions çok güçlüdür ama yanlış kullanılırsa sunucuyu patlatır.

### ✅ YAPILMASI GEREKENLER (Do's)

- **Idempotent Scriptler Yazın:** Scriptiniz 100 kere de çalışsa hata vermemeli.
  - _Kötü:_ `mkdir /app` (Klasör varsa hata verir, CI durur).
  - _İyi:_ `mkdir -p /app` (Varsa geçer, yoksa kurar).
- **Önce Staging:** Ana sunucuya (`main` branch) yollamadan önce, test sunucusunda (`dev` branch) deneyin.
- **SSH Timeout:** Bağlantı koparsa ne olacağını planlayın (`timeout` komutları kullanın).

### ❌ YAPILMAMASI GEREKENLER (Don'ts)

- **Root Kullanmak:** Asla `root` ile bağlanmayın. Bir hata tüm sunucuyu siler.
- **Hassas Veri:** `.env` dosyasını repoya atmayın. Onu sunucuda elle oluşturun veya GitHub Secrets ile enjekte edin.
- **Database Migration:** Otomatik yapmayın! Veri kaybı riski vardır. DB işlerini manuel ve yedekli yapın.

---

## 5. Güvenlik Uyarısı ⚠️

Bu yöntemde GitHub'a (Microsoft'a) sunucunuzun anahtarını veriyorsunuz.

- **Risk:** GitHub hacklenirse veya hesabınız çalınırsa sunucunuza girebilirler.
- **Önlem 1:** GitHub hesabınızda **2FA (İki Aşamalı Doğrulama)** mutlaka açık olsun.
- **Önlem 2:** Kullandığınız SSH Key'i sunucuda `root` yetkisine boğmayın. Sadece deploy yapabilen kısıtlı bir kullanıcı (`deployer`) kullanın.

## 6. Özet

Bu yapı kurulduktan sonra:

1.  Kodda değişiklik yap.
2.  `git push origin main` de.
3.  Arkanı yaslan, GitHub 1 dakika içinde sunucunu güncellesin. ☕
