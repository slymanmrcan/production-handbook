# Oracle Cloud Genel Bakış

Oracle Cloud Infrastructure (OCI), özellikle tek bir Linux sunucuyu düzgün ve düşük maliyetle barındırmak isteyenler için mantıklı bir seçenektir. Bu bölümün odağı marketing değil, iş gören bir server hosting baseline'ıdır.

## 1. OCI Ne Zaman Mantıklı?

OCI şu durumlarda iyi bir tercihtir:

- Küçük ve orta ölçekli Linux sunucuları barındıracaksanız
- Public IP, blok disk ve basit network katmanını tek panelden yönetmek istiyorsanız
- Always Free kapasitesiyle lab, staging veya küçük prod servis kuracaksanız
- Terraform veya CLI ile basit ama tekrar edilebilir bir altyapı istiyorsanız

OCI şu durumda doğru tercih olmayabilir:

- Çok karmaşık enterprise governance ihtiyacınız varsa
- Çok sayıda managed servis ve hazır entegrasyon bekliyorsanız
- Her şeyi tek vendor ekosistemi içinde standartlaştırmanız gerekiyorsa

## 2. Home Region ve Free Tier

OCI hesabı açtığınızda bir **home region** seçilir. Bu seçim önemlidir çünkü:

- Home region sonradan değişmez
- IAM kaynakları ve tenancy yönetimi burada merkezlenir
- Always Free kaynakları home region üzerinden anlam kazanır

Free Tier / Always Free tarafında kritik noktalar:

- Free kaynaklar tenancy'nin home region'ında kullanılmalıdır
- Always Free kapasite sınırsız değildir; kaynak limitlerini büyüklüğe göre planlamak gerekir
- Compute, block volume ve ağ kaynakları quota'ya takılabilir
- Deneme hesabı ile sürekli ücretsiz hesap arasındaki kaynak davranışı farklı olabilir

Pratik karar:

- Bölge seçerken kullanıcılarınıza en yakın ve OCI servislerinin aktif olduğu bir region seçin
- Lab ile prod'u aynı compartment veya aynı subnet üzerine yığmayın
- `home region` seçimini "sonradan bakarız" yaklaşımıyla yapmayın

OCI region mantığı hakkında kısa hatırlatma:

- Region, fiziksel coğrafi bölgedir
- Instance ve subnet gibi kaynaklar region'a bağlıdır
- IAM kaynakları home region'da yönetilir

## 3. Baseline Mimarisi

Tek bir Linux sunucu için önerilen başlangıç düzeni:

| Katman | Öneri | Neden? |
| :----- | :---- | :----- |
| **Compute** | Always Free eligible instance veya küçük bir VM | Basit ve maliyet kontrollü başlangıç için |
| **Network** | Public subnet + private subnet | Web katmanı ve veri katmanını ayırmak için |
| **Public IP** | Reserved Public IP | IP değişimini önlemek için |
| **Storage** | Ayrı Block Volume | Boot volume'den bağımsız veri saklamak için |
| **Access** | SSH key + non-root sudo user | Güvenli ve izlenebilir erişim için |

Tipik kullanım modeli:

- Public subnet: reverse proxy, bastion, public app endpoint
- Private subnet: veritabanı, internal service, worker
- Reserved IP: DNS, firewall, allowlist ve servis sürekliliği
- Block volume: veri, log, backup staging

## 4. SSH Key Politikası

OCI üzerinde sunucu açarken kendi oluşturduğunuz SSH public key'i yükleyin. Panelin ürettiği veya üçüncü tarafın verdiği anahtara bağımlı kalmayın.

Önerilen key standardı:

```bash
ssh-keygen -t ed25519 -a 100 -C "oci-prod"
ssh-keygen -lf ~/.ssh/id_ed25519.pub
```

Kurulum sırasında dikkat:

- Private key'i asla paylaşmayın
- Aynı key'i lab ve prod arasında körü körüne kullanmayın
- Sunucu image'ına parola ile girişe bel bağlamayın

Ubuntu image'lerinde genellikle `ubuntu`, Oracle Linux image'lerinde `opc` kullanılır. Image'a göre login user değişebilir; bunu launch ekranından doğrulayın.

## 5. Hangi Konu Nereye Gidiyor?

- [OCI CLI](cli.md): komut satırı ile yönetim
- [VCN ve Network](network.md): subnet, gateway, security list, NSG ve public IP
- [Block Volume](storage.md): disk ekleme, bağlama, büyütme ve mount etme

## 6. İlk Gün Checklist

1. Home region'ı doğrula
2. Compartment ayrımını planla
3. SSH key'i local üret ve doğrula
4. Instance için public subnet mi private subnet mi gerektiğini belirle
5. Reserved Public IP gerekiyor mu karar ver
6. Block volume gerekecek mi karar ver
7. OCI CLI çalışır duruma getir

## 7. Verify Matrix

| Kontrol | Komut / İşlem | Beklenen Sonuç |
| :------ | :------------ | :------------- |
| SSH key var mı | `ssh-keygen -lf ~/.ssh/id_ed25519.pub` | Public key fingerprint görünmeli |
| CLI kurulu mu | `oci --version` | Sürüm bilgisi dönmeli |
| Region bilgisi | `oci iam region-subscription list --tenancy-id <tenancy_ocid>` | Home region işaretli subscription görünmeli |
| Instance login user | Launch ekranı / image notu | `opc` veya `ubuntu` gibi doğru kullanıcı seçilmeli |
| Free tier uygunluğu | OCI Console Always Free label'ları | Kaynaklarda Always Free etiketi görünmeli |

## 8. Sorun Çözme Notları

- Free tier kaynaklarının home region dışında görünmemesi normaldir
- Region değiştirirseniz farklı resource listeleri görürsünüz
- SSH key hatası çoğu zaman OCI tarafı değil local key formatı problemidir
- Compute'u açtığınız halde ağa erişim yoksa sorun çoğunlukla subnet, route table veya security rules tarafındadır
