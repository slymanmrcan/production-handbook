# Honeypot ve Tarpit

Bu araçları gözlem amacıyla ayrılmış bir laboratuvar sunucusunda kullanın. Üretim sunucusunda yetkisiz erişim şüphesi varsa [Şüpheli Sunucu ve Yetkisiz Erişim](../runbooks/suspected-compromise.md) rehberini açın.

| Araç | Gözlem |
| :--- | :----- |
| Cowrie | Taklit SSH/Telnet oturumlarından giriş ve komut olaylarını kaydeder |
| Endlessh | SSH banner'ını yavaş gönderir ve bağlantı olaylarını kaydeder |

## Laboratuvarı Ayırın

- Ayrı bir VM ve ağ kullanın. Yönetim erişimini sınırlayın. Üretim ağına, yönetim portlarına, kimlik bilgilerine ve Docker socket'ine erişimi engelleyin.
- Laboratuvarın çıkış trafiğini gereken hedeflerle sınırlandırın. Örnek ve log dosyalarını özel depoda, kısıtlı izinlerle saklayın.
- Kurulum için proje belgelerinden sabit sürüm seçin. [Cowrie kurulum belgeleri](https://docs.cowrie.org/en/latest/INSTALL.html) · [Endlessh proje belgeleri](https://github.com/skeeto/endlessh)

## Doğrulama

```bash
sudo ss -lntp
sudo ufw status verbose
```

Laboratuvarda yalnızca amaçlanan yönetim ve gözlem portlarının dinlediğini, üretim ağına bağlantı kuralı bulunmadığını ve test olaylarının yerel loga ulaştığını doğrulayın. Container kullanıyorsanız port eşlemelerini `docker compose ps` ile ayrıca kontrol edin. Cowrie olaylarının işlenmesi için [Cowrie Log Analizi](cowrie-analysis.md) rehberini kullanın.
