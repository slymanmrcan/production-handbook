# Geliştirme Rehberi (Repository Development Guide)

Bu dosya, **Sunucu Kurulum El Kitabı** reposunun kendisini geliştirmek, bakımını yapmak ve yeni doküman/tasarım eklemek için teknik referanstır.

> **AI Agent'lar için:** Önce [`AGENTS.md`](AGENTS.md) dosyasındaki temel kuralları okuyun; build, versiyon sınırları, CSS bileşenleri ve CI/CD detayları için bu dosyayı referans alın.

---

## 1. Ortam & Versiyon Sınırları

Bağımlılıklar [`requirements.txt`](requirements.txt) içinde pinlenmiştir.

| Araç / Paket | Versiyon Sınırı | Not / Kısıt |
| :--- | :--- | :--- |
| **Python** | `>=3.10` (CI: `3.12`, Lokal test: `3.14`) | Virtual environment (`.venv/`) kullanın. |
| **MkDocs** | `>=1.6.1,<2.0` | **KRİTİK:** MkDocs `2.0` plugin ve tema sistemini kırdığı için `<2.0` sınırı zorunludur. |
| **Material for MkDocs** | `>=9.7.0,<10.0` | Tema (`mkdocs.yml` -> `theme.name: material`). |
| **pymdown-extensions** | `>=10.0,<13.0` | Superfences (Mermaid), tabbed, highlight ve details için gerekli. |

---

## 2. Lokal Kurulum & Doğrulama Komutları

```bash
# 1. Sanal ortam oluştur ve bağımlılıkları kur
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Canlı önizleme (http://127.0.0.1:8000)
mkdocs serve

# 3. Zorunlu doğrulama (kırık link, eksik nav veya markdown hatasında fail eder)
mkdocs build --strict
```

> **Kural:** Her değişiklikten sonra (commit / PR öncesi) `mkdocs build --strict` komutu **0 hata ve 0 kırık link** ile geçmelidir.

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
- **`mkdocs.yml`**: Merkezi navigasyon haritasıdır. `docs/` altına eklenen her yeni `.md` dosyası `nav:` altına eklenmelidir.
- **`docs/android/`**: Ayrı ve korunan Android yayınlama dokümantasyonudur. Silinmez, bozulmaz ve İngilizce olarak korunur.
- **`site/`**: `mkdocs build` çıktısıdır (`.gitignore` içinde). Manuel düzenlenmez.
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

## 6. Markdown Eklentileri & Tasarım Sistemi (`extra.css`)

[`mkdocs.yml`](mkdocs.yml) içinde aktif olan eklentiler:

- `pymdownx.highlight` (satır numaraları destekli kod blokları)
- `pymdownx.superfences` (**Mermaid** diyagramları için ```` ```mermaid ````)
- `pymdownx.tabbed` (`=== "Sekme 1"` formatında alternatif sekmeler)
- `admonition` & `pymdownx.details` (`!!! tip`, `!!! warning`, `??? note` katlanabilir kutular)
- `attr_list` & `md_in_html`

### Tema & Özel CSS Bileşenleri

Tasarım sistemi [`docs/stylesheets/extra.css`](docs/stylesheets/extra.css) dosyasında tanımlıdır.

- **Renk şeması:** Varsayılan karanlık tema (`slate`) ve üst menüden seçilebilen aydınlık tema (`default`).
- **Fontlar:** `DM Sans` (metin) ve `JetBrains Mono` (kod).
- **Özel CSS Sınıfları (Landing / Portal Sayfaları İçin):**
  - Ana sayfa `.sh-home`, `.sh-hero`, `.sh-hero__actions`, `.sh-btn`
  - Trafik şeması `.sh-topology`
  - Kurulum adımları `.sh-stepper`, `.sh-step`, `.sh-step__tag`
  - Hızlı erişim `.sh-quick`

> **Tasarım Kuralı:** Standart rehber sayfalarında saf Markdown + Admonition + Tab + Mermaid kullanın. Özel `.sh-*` HTML sınıflarını yalnızca portal/giriş sayfalarında (`docs/index.md` gibi) kullanın ve yeni inline `style="..."` yazmak yerine `extra.css` token'larını (`--surface-card`, `--accent`, `--border-subtle`) tercih edin.

---

## 7. CI/CD & Yayınlama

[`.github/workflows/build.yml`](.github/workflows/build.yml) akışı `main` dalına her push'ta otomatik çalışır:

1. Python `3.12` kurulur.
2. `pip install -r requirements.txt` ile pinlenmiş paketler yüklenir.
3. `mkdocs build --strict` ile site doğrulanır.
4. `mkdocs gh-deploy --force` ile `gh-pages` dalına yayınlanır.

---

## 8. Değişiklik Öncesi Kontrol Listesi

- [ ] Yeni dosya doğru rol dizinine mi eklendi? (`how-to/` vs `recipes/` vs `file-templates/` ayrımı)
- [ ] [`mkdocs.yml`](mkdocs.yml) `nav:` bölümüne eklendi mi?
- [ ] Güvenlik standartlarına (Docker Gateway, non-root, pinlenmiş imaj, secret izole) uyuyor mu?
- [ ] Altyapı/port/güvenlik kuralı değiştiyse `docs/ai-dev/` güncellendi mi?
- [ ] `mkdocs build --strict` hatasız geçti mi?
