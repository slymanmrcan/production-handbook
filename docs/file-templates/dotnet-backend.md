# .NET Backend (Production Ready) 🔷

Bu şablon, .NET projelerinizi (API veya MVC) prodüksiyon ortamına hazırlamak için **optimize edilmiş** Dockerfile örnekleri sunar.

Özellikle **Katmanlı Mimari (N-Layer / Clean Architecture)** kullanan projelerde bağımlılıkların doğru yönetilmesi ve **Docker Cache** mekanizmasının bozulmaması kritiktir.

## Runtime Hardening Checklist

Bu Dockerfile'ları prod'a almadan önce şu kararları netleştirin:

- final image mümkünse chiseled/distroless çizgide olsun
- container non-root kullanıcı ile çalışsın
- sadece gereken port expose edilsin
- config ve secret'lar image içine bake edilmesin
- health endpoint ve graceful shutdown davranışı doğrulanmış olsun
- immutable tag veya digest ile deploy edin; kör `latest` kullanmayın

---

## 🏗️ 1. Basit / Monolith Proje

Eğer projeniz tek bir `.csproj` dosyasından oluşuyorsa (klasik WebAPI), bu standart dosyayı kullanın.

```dockerfile
# --- Build Stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Önce sadece proje dosyasını kopyala ve restore et (Cache'i kullanmak için)
COPY ["MyApp.csproj", "./"]
RUN dotnet restore "MyApp.csproj"

# Şimdi kalan tüm kaynak kodlarını kopyala
COPY . .
RUN dotnet publish "MyApp.csproj" -c Release -o /app/publish /p:UseAppHost=false

# --- Final Stage (Chiseled Ubuntu) ---
# Shell içermeyen, hacklenmesi zor güvenli imaj
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled AS final
WORKDIR /app
COPY --from=build /app/publish .

# Port Ayarı (Chiseled imajlar 8080 kullanır)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "MyApp.dll"]
```

---

## 🏰 2. Katmanlı Mimari (Clean Architecture)

Clean Architecture projelerinde `Core`, `Infrastructure`, `Application` gibi birden fazla kütüphane projesi olur. `COPY . .` yapıp restore ederseniz, kodda **tek bir harf değişse bile** Docker tüm restore işlemini (paket indirmeyi) baştan yapar. Bu da build süresini 3-4 dakikaya çıkarır.

Aşağıdaki yöntem ile build süresini **saniyelere** düşürebilirsiniz.

**Senaryo:**

- `src/MyProject.Api` (Başlangıç Projesi)
- `src/MyProject.Core`
- `src/MyProject.Infrastructure`

```dockerfile
# --- Build Stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# ADIM 1: Sadece .csproj dosyalarını (klasör yapısını koruyarak) kopyala
# Bu sayede kod değişse bile bu katman cache'den gelir.
COPY ["src/MyProject.Api/MyProject.Api.csproj", "src/MyProject.Api/"]
COPY ["src/MyProject.Core/MyProject.Core.csproj", "src/MyProject.Core/"]
COPY ["src/MyProject.Infrastructure/MyProject.Infrastructure.csproj", "src/MyProject.Infrastructure/"]

# ADIM 2: Restore işlemini başlat (Sadece csproj'lar varken)
RUN dotnet restore "src/MyProject.Api/MyProject.Api.csproj"

# ADIM 3: Artık kodları kopyala
COPY . .

# ADIM 4: Build ve Publish
WORKDIR "/src/src/MyProject.Api"
RUN dotnet publish "MyProject.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# --- Final Stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyProject.Api.dll"]
```

---

## 🖼️ 3. MVC vs API Farkı

MVC projesi deploy ediyorsanız süreç API ile **%95 aynıdır**. Tek fark, eğer **Frontend Assets (CSS/JS)** için Node.js kullanıyorsanız (örneğin Webpack, TailwindCSS derlemesi gerekiyorsa) Dockerfile içine bir Node katmanı eklenmelidir.

**MVC için Node.js Eklenmiş Build Stage:**

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Node.js Kurulumu (Build aşamasında gerekli)
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /src
# ... (CSProj Restore Adımları Aynı) ...

COPY . .

# Publish öncesi Frontend Build (Örnek)
WORKDIR "/src/src/MyProject.Web"
RUN npm install
RUN npm run build # CSS/JS dosyalarını wwwroot altına atar

# Sonra .NET Publish (wwwroot dahil edilir)
RUN dotnet publish "MyProject.Web.csproj" -c Release -o /app/publish
```

> [!TIP]
> Eğer Frontend build işlemini (npm run build) local'de yapıp `wwwroot` klasörünü commit atıyorsanız, yukarıdaki Node.js adımına gerek yoktur. Standart .NET Dockerfile yeterlidir.
>
> `curl | bash` ile Node kurmak yerine ayrı bir `node:<version>` build stage kullanmak daha güvenlidir. Böylece hem supply-chain yüzeyi daralır hem de SDK imajına ek paket yüklemezsiniz.

## Deployment Verification

```bash
docker inspect <container> --format '{{.Config.Image}} {{.Config.User}}'
docker inspect <container> --format '{{json .Config.ExposedPorts}}'
docker exec <container> printenv | rg 'ASPNETCORE_|DOTNET_'
curl -fsS http://127.0.0.1:8080/health || curl -fsS http://127.0.0.1:8080/healthz
docker logs <container> --tail 100
```

Beklenen sonuç:

- Çalışan image chiseled/final stage çıktısı olmalı.
- `User` alanı boş kalmamalı; runtime root olmamalı.
- Uygulama health endpoint'i başarılı dönmeli.
- Loglarda missing env, bind error veya migration loop görünmemeli.
