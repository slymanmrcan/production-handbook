# AI-Based Development Rehberi 🤖

Modern yazılım geliştirme süreçlerinde kodun, Dockerfile'ların, CI/CD akışlarının ve konfigürasyon dosyalarının büyük bölümü **AI destekli** (AI-assisted / AI-based development) üretiliyor.

Bu bölümün amacı, AI'ın tek başına sunucuya bağlanıp işlem yapması değil; **geliştiricinin AI ile kod yazarken ve sistem tasarlarken sunucu/production gerçekleriyle tam uyumlu kalmasını sağlamaktır.**

---

## Neden Bu Katman Var?

AI modelleri varsayılan olarak "çalışan en kısa örneği" üretmeye eğilimlidir. Ancak varsayılan örnekler çoğu zaman production standartlarını ihlal eder:

| AI'ın Varsayılan Alışkanlığı | Production Riski | Bu Handbook'taki Standart |
| :--- | :--- | :--- |
| `ports: ["3000:3000"]` veya `["5432:5432"]` | Docker `iptables` üzerinden **UFW'yi bypass eder**, servis dünyaya açılır. | [Docker Gateway](../security/docker-gateway.md) + `127.0.0.1` bind veya `expose`. |
| `FROM node:latest` / root kullanıcı | Tekrarlanabilir olmayan build ve container escape riski. | Immutable tag + multi-stage + non-root user. |
| `.env` içine secret gömme veya repo'ya commit | Credential sızıntısı. | File-based secrets / izole runtime env. |
| Healthcheck, log limiti ve CPU/RAM limiti yok | Memory leak veya sonsuz log host'u kilitler. | Zorunlu `/healthz`, `json-file` rotate, `limits`. |
| `chmod 777` veya `ufw disable` ile hızlı çözüm | Güvenlik katmanlarının sessizce çökmesi. | En az yetki prensibi + doğrulanabilir config. |

---

## Bu Bölümdeki Belgeler

1. **[Altyapı Bağlamı (AI Ne Bilsin?)](infra-context.md)**  
   AI ile kodlama yaparken sunucunun topolojisi, port aralıkları, ağ izolasyonu, TLS ve loglama kurallarının tek sayfalık özeti.
2. **[Uygulama-Sunucu Kontratı](app-contracts.md)**  
   AI'ın ürettiği `.NET`, `React`, `Node/Python`, `PostgreSQL` ve `Redis` servislerinin bu sunucuda sorunsuz çalışması için uyması gereken teknik sözleşme.
3. **[AI Denetim Kapıları (Audit Gates)](ai-audit-gates.md)**  
   AI üretimi kod, Dockerfile, `docker-compose.yml`, Nginx config veya bash script canlıya çıkmadan önce geçmesi gereken zorunlu kontrol listesi.
4. **[Hazır Context / Rule Şablonları](context-templates.md)**  
   Yeni bir yazılım reposundaki `AGENTS.md` veya proje kurallarına kopyalanıp yapıştırılabilecek hazır altyapı bağlam blokları.
5. **[AI ile Altyapı & Ops Çalışma Rehberi](prompt-and-review-playbook.md)**  
   Konfigürasyon yazdırırken, log okuturken veya arıza çözerken AI'a hangi çıktıları nasıl verip sonuçları nasıl doğrulayacağınız.

---

## Çalışma Prensibi (3 Kural)

1. **Bağlamı Baştan Ver:** AI'a kod veya konfigürasyon yazdırmadan önce projenin deploy edileceği sunucu kontratını ([infra-context.md](infra-context.md)) proje kurallarına ekle.
2. **Güvenme, Doğrula:** AI'ın ürettiği her infra çıktısı (`sshd_config`, `nginx.conf`, `docker-compose.yml`, `Dockerfile`, `.sh`) mutlaka sentaks ve güvenlik kontrolünden ([ai-audit-gates.md](ai-audit-gates.md)) geçer.
3. **Sırrı Paylaşma, Yapıyı Paylaş:** Prompt veya context içine gerçek şifre, private key, token veya müşteri verisi konmaz; sadece şema, config yapısı ve anonimleştirilmiş log verilir.
