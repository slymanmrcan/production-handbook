# .NET Recipe

Bu recipe, production'da calisan bir .NET API veya web uygulamasini konteynerde minimal yuzeyle calistirmak icin kullanilir. Tercih edilen model chiseled imaj, non-root runtime ve host'tan bagimsiz state tasarimidir.

## Ne Zaman Secilir

- ASP.NET Core API, worker veya minimal web app varsa
- Runtime shell ihtiyaci yoksa
- Uygulama reverse proxy arkasinda calisiyorsa

## Varsayimlar

- Build CI'da veya ayrik bir build stage'de yapilir
- Runtime container sadece publish cikisini tasir
- Uygulama ic state'e degil dis servis ve volume'lere baglanir
- Public port uygulamada degil proxy katmaninda sonlanabilir

## Hardening Kararlari

- `jammy-chiseled` veya esdeger minimal imaj tercih edilir
- `read_only` root filesystem kullanilir
- Sadece gerekli ise `NET_BIND_SERVICE` eklenir
- `tmpfs` ile gecici dizinler yazilabilir tutulur
- `no-new-privileges:true` varsayilan olur

## Build Stage

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["MyApp.csproj", "./"]
RUN dotnet restore "MyApp.csproj"

COPY . .
RUN dotnet publish "MyApp.csproj" -c Release -o /app/publish /p:UseAppHost=false
```

## Runtime Stage

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled AS runtime
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

ENTRYPOINT ["dotnet", "MyApp.dll"]
```

## Compose Baseline

```yaml
services:
  api:
    build: .
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:8080/healthz >/dev/null"]
      interval: 30s
      timeout: 5s
      retries: 3
```

Eger uygulama 80/443 dinlemek zorundaysa bunu container icinde degil, edge proxy ile cozmeye calis.

## Alpine Alternatifi

Debug icin shell gerekiyorsa Alpine kullanabilirsin. Bu durumda yine non-root user tanimla ve build/runtime ayrimini koru.

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["MyApp.csproj", "./"]
RUN dotnet restore "MyApp.csproj"

COPY . .
RUN dotnet publish "MyApp.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app
COPY --from=build /app/publish .

RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -D appuser

USER appuser
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

## Doğrulama

```bash
docker build -t my-dotnet-api .
docker run --rm -p 8080:8080 my-dotnet-api
curl -fsS http://127.0.0.1:8080/healthz
```

Beklenen durum:

- Publish cikisi build stage'den runtime'a tasinmali
- Container non-root calismali
- Health endpoint cevap vermeli
- Root filesystem'e yazma ihtiyaci olmamali
