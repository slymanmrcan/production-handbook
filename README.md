# Sunucu Kurulum El Kitabı

Production-ready Linux (Ubuntu/Debian) sunucu kurulumu, güvenlik sertleştirme ve **AI-Based Development** altyapı standartları rehberi.

## 📖 Dokümantasyon

**Canlı Site:** [https://slymanmrcan.github.io/production-handbook/](https://slymanmrcan.github.io/production-handbook/)

## 🎯 Özellikler

- **Net Kurulum Akışı (Day 0 → Day 1 → Day 2):** Sıfırdan canlıya tek yol haritası ve doğrulama kapıları.
- **Güvenlik Odaklı:** Zorunlu baseline (SSH, UFW, Fail2Ban, Docker Gateway) + 15 katmanlı derin savunma.
- **AI-Based Development Katmanı:** AI destekli kodlama yaparken altyapı bağlamı, uygulama-sunucu kontratları, denetim kapıları ve hazır `AGENTS.md` şablonları.
- **Otomasyon & Operasyon:** Idempotent Bash script kütüphanesi, üretim reçeteleri, runbook'lar ve troubleshooting rehberleri.

## 🚀 Hızlı Başlangıç

```bash
# Repoyu klonla
git clone https://github.com/slymanmrcan/production-handbook.git
cd production-handbook

# Sanal ortam & bağımlılıklar (pinlenmiş versiyonlar)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Lokal olarak çalıştır
mkdocs serve

# Değişiklik öncesi zorunlu doğrulama
mkdocs build --strict
```

Tarayıcıda `http://127.0.0.1:8000` adresini açın. Repo geliştirme detayları, versiyon sınırları ve tasarım sistemi için [`DEVELOPMENT.md`](DEVELOPMENT.md) dosyasına bakın.

## 📝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişiklikleri `AGENTS.md` kurallarına uygun şekilde commit edin
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje açık kaynaklıdır ve özgürce kullanılabilir.

## 🔗 Bağlantılar

- [Canlı Dokümantasyon](https://slymanmrcan.github.io/production-handbook/)
- [GitHub Repository](https://github.com/slymanmrcan/production-handbook)
