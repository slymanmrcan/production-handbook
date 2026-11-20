---
hide:
  - navigation
  - toc
---

<div class="sh-home" markdown="1">

<div class="sh-hero" markdown="1">

<div markdown="1">

<p class="sh-platforms">Ubuntu · Debian · Docker</p>

# Sunucu Kurulum El Kitabı

Linux sunucusunu güvenli kur, Docker ile uygulamanı yayınla ve canlı sistemi işlet.

<div class="sh-hero__actions" markdown="1">

[Kuruluma başla](getting-started/roadmap.md){ .sh-btn }
[Olay müdahale rehberleri](runbooks/index.md)

</div>

</div>

<div class="sh-terminal" markdown="1">

## Doğrulama komutları

<dl>
  <dt>SSH yapılandırması</dt>
  <dd><code>sudo sshd -t</code></dd>
  <dt>Compose yapılandırması</dt>
  <dd><code>docker compose config --quiet</code></dd>
  <dt>Başarısız servisler</dt>
  <dd><code>systemctl --failed</code></dd>
</dl>

[Canlıya geçiş kontrol listesi](checklists/prod-ready.md)

</div>

</div>

## Sunucu yaşam döngüsü

<div class="sh-stepper">
  <a class="sh-step" href="getting-started/roadmap/#day-0">
    <span class="sh-step__tag">DAY 0</span>
    <h3>Sunucuyu hazırla</h3>
    <p>Bulut, temel sistem, SSH, UFW ve Docker.</p>
  </a>
  <a class="sh-step" href="getting-started/roadmap/#day-1">
    <span class="sh-step__tag">DAY 1</span>
    <h3>Uygulamayı yayınla</h3>
    <p>Reverse proxy, TLS, uygulama ve veritabanı.</p>
  </a>
  <a class="sh-step" href="getting-started/roadmap/#day-2">
    <span class="sh-step__tag">DAY 2</span>
    <h3>Canlı sistemi işlet</h3>
    <p>İzleme, yedekleme ve olay müdahalesi.</p>
  </a>
</div>

## Hızlı erişim

<div class="sh-bento" markdown="1">

<div class="sh-card" markdown="1">

### Kurulum ve güvenlik

- [Cloud Guardrails](cloud/shared/index.md)
- [Temel OS ve Cloud-Init](how-to/base-os.md)
- [Server Bootstrap Script](scripts/library/bootstrap.md)
- [Güvenlik rehberleri](security/index.md)
- [SSH Hardening](security/ssh.md)
- [İlk kurulum kontrol listesi](checklists/server-first-setup.md)

</div>

<div class="sh-card" markdown="1">

### Altyapı ve uygulama

- [Mimari ve topoloji](architecture/overview.md)
- [Port stratejisi ve izolasyon](architecture/port-strategy.md)
- [Docker Gateway mimarisi](security/docker-gateway.md)
- [Uygulama reçeteleri](recipes/index.md)
- [Docker App Launch Checklist](checklists/app-launch.md)

</div>

<div class="sh-card" markdown="1">

### Operasyon ve bakım

- [Monitoring Stack](how-to/monitoring-stack.md)
- [Merkezi loglama](how-to/centralized-logging.md)
- [Yedekleme stratejisi](how-to/backups.md)
- [Yedekten dönme testi](how-to/disaster-recovery-drill.md)

</div>

<div class="sh-card" markdown="1">

### AI destekli geliştirme

- [Genel yaklaşım](ai-dev/index.md)
- [Altyapı bağlamı](ai-dev/infra-context.md)
- [Uygulama-sunucu kontratı](ai-dev/app-contracts.md)
- [AI denetim kapıları](ai-dev/ai-audit-gates.md)
- [Hazır AGENTS.md şablonları](ai-dev/context-templates.md)

</div>

</div>

!!! tip "Docker ve UFW"
    Docker, `ports: ["3000:3000"]` gibi bir eşlemeyle yayınlanan portları UFW kurallarından bağımsız olarak dışarı açabilir. İç servisleri izole etmek için [Docker Gateway rehberini](security/docker-gateway.md) takip et.

</div>
