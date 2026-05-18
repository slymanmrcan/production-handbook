# Docker Komutları

Container, image ve compose seviyesinde hızlı operatör referansı.

## Hızlı Triyaj

Önce ne çalışıyor, ne düşmüş, ne log basıyor?

```bash
docker ps
docker ps -a
docker compose ps
docker stats
docker system df
```

- `docker ps` ile canlı konteynerleri gör.
- `docker compose ps` multi-service stack'lerde daha anlamlıdır.
- `docker system df` image, container ve volume tüketimini ayırır.

## Log ve İnceleme

Sorunlu konteynerin içini ve geçmişini kontrol et.

```bash
docker logs --tail 200 -f <container>
docker inspect <container>
docker exec -it <container> sh
docker diff <container>
docker image inspect <image>
docker history <image>
```

- `docker logs` uygulama hatasını görmek için ilk duraktır.
- `docker inspect` network, volume, env ve restart policy'yi gösterir.
- `docker exec` kısa teşhis içindir; prod'da kalıcı değişiklik için kullanma.

## Compose Akışı

Stack bazlı deploy ve doğrulama için.

```bash
docker compose config
docker compose pull
docker compose up -d
docker compose up -d --no-deps --force-recreate <service>
docker compose logs --tail 100 -f
docker compose restart <service>
```

- `docker compose config` compose dosyasını birleştirip nihai hali gösterir.
- `--force-recreate` yalnızca gerçekten yeniden yaratman gerekiyorsa kullan.
- `pull` sonrası `config` ve `ps` ile doğrula.

## Image ve Cache Yönetimi

Yeni sürüm çekme, eski image temizleme, build cache kontrolü.

```bash
docker image ls
docker pull <image>
docker rmi <image_id>
docker builder prune
docker system df -v
```

- `rmi` sadece artık kullanılmayan image'larda güvenlidir.
- `builder prune` disk rahatlatır ama build cache'i atar.

## Temizlik ve Bakım

Alan açmak için kullan, ama etkisini ölçmeden çalıştırma.

```bash
docker container prune
docker image prune
docker volume ls
docker volume inspect <volume>
docker system prune
docker system prune -a
docker system prune --volumes
```

- `prune` komutları geri dönüşsüz temizlik yapar.
- `--volumes` ve `-a` prod'da çok daha risklidir; önce neyi sileceğini anla.
- Kullanılmayan volume silmek, veri kaybı anlamına gelebilir.

## Doğrulama

Değişiklikten sonra hızlı kontrol:

```bash
docker ps
docker compose ps
docker logs --tail 50 <container>
curl -fsS http://127.0.0.1:8080/health
```

## Yüksek Riskli Komutlar

```bash
docker rm -f <container>
docker compose down -v
docker volume prune
docker system prune -a --volumes
```

- `docker rm -f` çalışan servisi anında keser.
- `docker compose down -v` volume bağlı state'i silebilir.
- `prune --volumes` çoğu stack için son çare olmalıdır.
