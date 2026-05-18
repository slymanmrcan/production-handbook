# Sunucu Kurulum El Kitabı

![Server Architecture](https://img.shields.io/badge/Ubuntu-24.04%20LTS-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Hardened-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Security](https://img.shields.io/badge/Security-First-green?style=for-the-badge&logo=shield&logoColor=white)

---

## Production-Ready Sunucu Mimarisi: Sıfırdan Canlıya. 🚀

Bu rehber, rastgele blog yazılarının birleşimi değildir. **Güvenlik, Performans ve Sürdürülebilirlik** odaklı, savaşta test edilmiş (battle-tested) bir kurulum standardıdır.

> **🔥 30 Saniyede Özet:** Modern bir Linux sunucusu sadece "çalışan" değil, "kendini savunan" ve "ne yaptığını anlatan" bir yapıda olmalıdır.

---

## Neden Bu Rehber? 🏛️

Aşağıdaki üç prensip, bu el kitabının temelini oluşturur:

| 🛡️ **Güvenlik (Security)**                                                                             | ⚡ **Performans (Performance)**                                                                               | 🧘 **Sadelik (Simplicity)**                                                                        |
| :----------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------- |
| "Firewall'u kapatıp deneyelim" yok. **15 Katmanlı Savunma** stratejisi ile her adımı güvenli atıyoruz. | Varsayılan ayarlar yetersizdir. Kernel tuning, Nginx hardening ve minimal Docker imajları ile maksimum verim. | Grafik arayüzler ve gereksiz araçlar yok (**Zero Bloat**). Sadece işini yapan, temiz CLI araçları. |

---

## Hızlı Erişim (Portal) 🗂️

İhtiyacınız olan bölüme doğrudan gidin:

| 🚀 **Başlangıç**                                                                                                                                                                                | 🔒 **Güvenlik Merkezi**                                                                                                                                                                     |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [Temel OS Kurulumu](how-to/base-os.md)<br>- [Cloud-Init (First Boot)](how-to/cloud-init.md)<br>- [Netplan & DNS Temeli](how-to/network-baseline.md)<br>- [Disk & LVM Yonetimi](how-to/storage-lvm.md)<br>- [İlk Kurulum Checklist](checklists/server-first-setup.md) | - [**15 Katmanlı Güvenlik Mimarisi**](security/index.md) ⭐<br>- [SSH Hardening](security/ssh.md)<br>- [Firewall (UFW)](security/firewall.md)<br>- [Malware & Rootkit](security/malware.md) |

| 🥘 **Uygulama Reçeteleri**                                                                                                                                                       | ☁️ **Cloud & Operasyon**                                                                                                                                                                                                                  |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [Recipes Portalı](recipes/index.md)<br>- [.NET Core Hardening](recipes/dotnet.md) 🔷<br>- [React + Nginx](recipes/react.md) ⚛️<br>- [PostgreSQL Tuning](recipes/postgres.md) 🐘<br>- [Nginx Proxy](recipes/nginx.md) 🌐 | - [Cloud Guardrails](cloud/shared/index.md)<br>- [Oracle Cloud Kurulumu](cloud/oracle/overview.md)<br>- [AWS Altyapısı](cloud/aws/concepts.md)<br>- [Google Cloud Kurulumu](cloud/google/overview.md)<br>- [Referans Portalı](reference/index.md)<br>- [Troubleshooting Metodolojisi](troubleshooting/index.md)<br>- [Merkezi Loglama](how-to/centralized-logging.md)<br>- [Yedekleme Stratejisi](how-to/backups.md)<br>- [DR Drill](how-to/disaster-recovery-drill.md)<br>- [Acil Durum (Runbooks)](runbooks/index.md) 🚨 |

---

## Öne Çıkanlar ⭐

!!! tip "Docker Kullananlar Dikkat!"
Sıradan bir `docker-compose.yml` dosyası sunucunuzu riske atabilir.
**[Master Docker Security Guide](security/docker.md)** rehberini okumadan production'a çıkmayın!

!!! warning "Güvenlik Bir Eklenti Değildir"
Sunucunuzu kurduktan sonra **[Lynis Audit](security/lynis.md)** ile taratıp puanınızı görmeyi unutmayın. Hedef: **80+**

---

## Katkıda Bulunun 🤝

Bu yaşayan bir dokümandır. Hatalı gördüğünüz veya geliştirmek istediğiniz bir nokta varsa, lütfen Pull Request gönderin veya Issue açın.
