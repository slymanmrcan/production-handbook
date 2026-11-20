# Geliştirme Rehberi (Repository Development Guide)

Bu dosya, **Sunucu Kurulum El Kitabı** reposunun kendisini geliştirmek, bakımını yapmak ve yeni doküman/tasarım eklemek için teknik referanstır.

> **AI Agent'lar için:** Önce [`AGENTS.md`](AGENTS.md) dosyasındaki temel kuralları okuyun; build, versiyon sınırları, CSS bileşenleri ve CI/CD detayları için bu dosyayı referans alın.

---

## 1. Ortam

CI Node.js 24 kullanır. Kurulum için Node.js en az `22.23.4` olmalıdır. Astro ve Starlight sürümleri [`package-lock.json`](package-lock.json) ile kilitlenir.

## 2. Yerel geliştirme

```bash
npm ci
npm run dev
npm run build
npm run preview
```

Geliştirme sunucusu rehberi `http://localhost:4321/production-handbook/` adresinde açar. `npm run build` statik çıktıyı üretir ve dahili bağlantıları, başlık bağlantılarını ve yan menü kapsamını kontrol eder. Yayınlanmış aramayı yerelde denemek için derlemeden sonra `npm run preview` kullanın.

---

## 3. Hedef Altyapı Versiyon Matrisi (İçerik Standartları)

Dokümanlarda, reçetelerde ve şablonlarda tutarlılık için aşağıdaki hedef sürümler baz alınır:

| Katman | Hedef / Minimum Sürüm | Yasaklı / Eski Desenler |
| :--- | :--- | :--- |
| **OS** | Ubuntu `24.04 LTS` / `22.04 LTS`, Debian `12` | Ubuntu 18.04/20.04, deprecated `ifconfig`/`apt-key` |
| **Container** | Docker Engine + **Compose v2** (`docker compose`) | `docker-compose` (v1), `:latest` imaj etiketleri |
| **Networking** | UFW + Docker Gateway (`expose` veya `127.0.0.1:P:P`) | Çıplak `ports: ["PORT:PORT"]` (UFW'yi bypass eder) |
| **Reverse Proxy** | Nginx (TLS 1.2/1.3) veya Traefik v3 | HTTP-only prod config, `nginx -t` olmadan restart |
| **Database / Cache** | PostgreSQL `16`, MariaDB `11`, Redis `7` | Public bind (`0.0.0.0`) |
| **Runtime** | .NET `8` / `9`, Node `20` / `22 LTS` | Root user ile çalışan container |
| **Bash Scripts** | `set -Eeuo pipefail`, idempotent | `curl ... \| sh` |

---

## 4. Dizin Sınırları & Dokunulmaması Gerekenler

- **`docs/`**: Yalnızca canlı sitede yayınlanacak son kullanıcı dokümanları bulunur. Repo-içi geliştirme dosyaları (`AGENTS.md`, `DEVELOPMENT.md`, `requirements.txt`) **repo kökünde** tutulur.
- **`src/navigation.mjs`**: Üst menüyü ve bölüme göre görünen yan menüyü tanımlar. Yeni rehberleri ilgili bölüme ekleyin.
- **`docs/android/`**: Ayrı ve korunan Android yayınlama dokümantasyonudur. Silinmez, bozulmaz ve İngilizce olarak korunur.
- **`dist/`**: `npm run build` statik çıktısıdır. Kaynak dosyalar üzerinden güncellenir.
- **`engine-readme.md`**: İç ticari/SaaS planıdır (`.gitignore` içinde). Public dokümanlara taşınmaz.
- **`docs/ai-dev/`**: Altyapı standartları, port stratejisi veya güvenlik baseline'ı değiştiğinde `infra-context.md`, `app-contracts.md` ve `context-templates.md` aynı değişiklikte güncellenmelidir.

---

## 5. Dil, Ton & Sayfa Şablonu

- **Dil Politikası:**
  - Ana dokümantasyon: **Türkçe** (teknik terimler, CLI komutları, dosya yolları ve config anahtarları İngilizce).
  - `docs/android/`: **İngilizce**.
- **Ton:** Senior SRE seviyesinde, doğrudan, gereksiz giriş/dolgu cümlesi olmadan aksiyon odaklı.
- **Zorunlu Doğrulama Adımı:** Her kurulum/konfigürasyon rehberi somut bir **Doğrulama (Verify)** bölümü içermelidir (`sshd -t`, `nginx -t`, `ss -tulpn`, `docker compose ps`, `curl -I` vb.).

---

## 6. Markdown ve site tasarımı

- Rehberleri `docs/` içinde tutun. Starlight sayfa başlığını frontmatter içindeki `title` alanından veya belgenin ilk H1 başlığından alır.
- Aynı klasördeki sayfaları `[Bağlantı](sayfa.md)` biçiminde bağlayın. Bölüme bağlantı verirken mevcut Markdown dosya yoluna `#başlık` ekleyin.
- Uyarılar için Starlight’ın `:::note`, `:::tip` ve `:::caution` kutularını kullanın. Katlanabilir içerik için `<details>`, sekmeler için MDX içinde `Tabs` ve `TabItem` kullanın.
- Diyagramları `mermaid` kod bloğu olarak yazın. Diyagram çizici tarayıcıda ihtiyaç olduğunda yüklenir.
- Stiller [`src/handbook.css`](src/handbook.css), üst ve yan menü bileşenleri [`src/components/`](src/components/) altındadır.

---

## 7. CI/CD ve yayın

[GitHub Actions akışı](.github/workflows/build.yml), pull request’lerde ve `main` dalında kilitli bağımlılıkları kurup üretim derlemesini çalıştırır. `main` derlemesinin doğrulanmış `dist/` çıktısı GitHub Pages’e yayınlanır.

İlk Starlight yayınından önce repoda **Settings → Pages → Build and deployment → Source → GitHub Actions** seçili olmalıdır. Yayın yolu [`astro.config.mjs`](astro.config.mjs) içindeki `/production-handbook` taban adresini kullanır.

---

## 8. Değişiklik Öncesi Kontrol Listesi

- [ ] Yeni dosya doğru rol dizinine mi eklendi? (`how-to/` vs `recipes/` vs `file-templates/` ayrımı)
- [ ] [`src/navigation.mjs`](src/navigation.mjs) içinde doğru bölüme eklendi mi?
- [ ] Güvenlik standartlarına (Docker Gateway, non-root, pinlenmiş imaj, secret izole) uyuyor mu?
- [ ] Altyapı/port/güvenlik kuralı değiştiyse `docs/ai-dev/` güncellendi mi?
- [ ] `npm run build` hatasız geçti mi?
