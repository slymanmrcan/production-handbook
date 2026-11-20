---
hide:
  - navigation
  - toc
---

<div class="sh-hero">
  <div class="sh-hero__content">
    <div class="sh-eyebrow">Ubuntu 24.04 LTS · Docker Hardened · AI-Based Dev Ready</div>
    <h1 class="sh-hero__title">Production-Ready Sunucu Mimarisi.<br/><span>Sıfırdan Canlıya.</span></h1>
    <p class="sh-hero__desc">
      Rastgele blog yazılarının birleşimi değil; güvenlik, doğrulanabilir kurulum adımları ve
      <strong>AI-Based Development</strong> standartlarıyla hizalanmış canlı operasyon el kitabı.
    </p>
    <div class="sh-hero__actions">
      <a class="sh-btn sh-btn--primary" href="getting-started/roadmap/">Kuruluma Başla (Day 0 → 2)</a>
      <a class="sh-btn sh-btn--ghost" href="ai-dev/">AI-Based Dev Kontratları</a>
      <a class="sh-btn sh-btn--ghost" href="checklists/prod-ready/">Go / No-Go Matrisi</a>
    </div>
    <div class="sh-stats">
      <div class="sh-stat"><strong>Day 0 → 2</strong><span>Lineer kurulum hattı</span></div>
      <div class="sh-stat"><strong>15 Katman</strong><span>Savunma &amp; Hardening</span></div>
      <div class="sh-stat"><strong>20 Runbook</strong><span>Acil durum müdahale</span></div>
      <div class="sh-stat"><strong>AI Audit</strong><span>Kod &amp; Infra denetimi</span></div>
    </div>
  </div>
</div>

## 3 Adımda Yaşam Döngüsü

<div class="sh-stepper">
  <a class="sh-step" href="getting-started/roadmap/#day-0">
    <span class="sh-step__tag sh-step__tag--sky">DAY 0 · BASELINE</span>
    <h3>Sunucu Hazırlığı &amp; Güvenlik</h3>
    <p>Cloud guardrails, temel OS, SSH hardening, UFW, Fail2Ban ve Docker Gateway kurulumu.</p>
  </a>
  <a class="sh-step" href="getting-started/roadmap/#day-1">
    <span class="sh-step__tag sh-step__tag--violet">DAY 1 · DEPLOY</span>
    <h3>Stack, Proxy &amp; AI Uyumu</h3>
    <p>Port stratejisi, Nginx/Traefik + TLS, uygulama reçeteleri ve AI denetim kapıları.</p>
  </a>
  <a class="sh-step" href="getting-started/roadmap/#day-2">
    <span class="sh-step__tag sh-step__tag--emerald">DAY 2 · OPERATIONS</span>
    <h3>İzleme, Backup &amp; Runbooks</h3>
    <p>Monitoring stack, merkezi loglama, DR restore testleri ve olay müdahale rehberleri.</p>
  </a>
</div>

## Hızlı Erişim Portalı

<div class="sh-bento">

  <div class="sh-card sh-card--featured">
    <div class="sh-card__head">
      <h3 class="sh-card__title">AI-Based Development</h3>
      <span class="sh-pill sh-pill--ai">YENİ KATMAN</span>
    </div>
    <p class="sh-card__desc">AI ile kodlama yaparken sunucu, port, güvenlik ve deploy kurallarını netleştiren sözleşmeler.</p>
    <ul class="sh-card__links">
      <li><a href="ai-dev/">Genel Yaklaşım &amp; Prensipler</a></li>
      <li><a href="ai-dev/infra-context/">Altyapı Bağlamı (AI Ne Bilsin?)</a></li>
      <li><a href="ai-dev/app-contracts/">Uygulama-Sunucu Kontratı</a></li>
      <li><a href="ai-dev/ai-audit-gates/">AI Denetim Kapıları (Audit Gates)</a></li>
      <li><a href="ai-dev/context-templates/">Hazır AGENTS.md Şablonları</a></li>
    </ul>
  </div>

  <div class="sh-card">
    <div class="sh-card__head">
      <h3 class="sh-card__title">Kurulum Akışı (Day 0)</h3>
      <span class="sh-pill">BAŞLANGIÇ</span>
    </div>
    <p class="sh-card__desc">Yeni bir sunucuyu ilk açılıştan doğrulanmış tabana getiren tek hat.</p>
    <ul class="sh-card__links">
      <li><a href="getting-started/roadmap/">Sunucu Kurulum Yol Haritası</a></li>
      <li><a href="cloud/shared/">Cloud Guardrails (IAM, Cost, Secrets)</a></li>
      <li><a href="how-to/base-os/">Temel OS &amp; Cloud-Init</a></li>
      <li><a href="scripts/library/bootstrap/">Server Bootstrap Script</a></li>
      <li><a href="checklists/server-first-setup/">İlk Kurulum Doğrulama Protokolü</a></li>
    </ul>
  </div>

  <div class="sh-card">
    <div class="sh-card__head">
      <h3 class="sh-card__title">Altyapı &amp; Stack Blueprints</h3>
      <span class="sh-pill">DAY 1</span>
    </div>
    <p class="sh-card__desc">Topoloji, port izolasyonu, üretim reçeteleri ve temiz config şablonları.</p>
    <ul class="sh-card__links">
      <li><a href="architecture/overview/">Mimari Genel Bakış &amp; Topoloji</a></li>
      <li><a href="architecture/port-strategy/">Port Stratejisi &amp; İzolasyon</a></li>
      <li><a href="security/docker-gateway/">Docker Gateway Mimarisi</a></li>
      <li><a href="recipes/">Uygulama Reçeteleri (.NET, React, PG, Redis)</a></li>
      <li><a href="checklists/app-launch/">Docker App Launch Checklist</a></li>
    </ul>
  </div>

  <div class="sh-card">
    <div class="sh-card__head">
      <h3 class="sh-card__title">Güvenlik &amp; Operasyon</h3>
      <span class="sh-pill">DAY 2</span>
    </div>
    <p class="sh-card__desc">Zorunlu güvenlik baseline'ı, derin savunma, izleme ve acil müdahale.</p>
    <ul class="sh-card__links">
      <li><a href="security/">15 Katmanlı Güvenlik Mimarisi</a></li>
      <li><a href="security/ssh/">SSH Hardening &amp; Firewall</a></li>
      <li><a href="how-to/monitoring-stack/">Monitoring Stack &amp; Merkezi Loglama</a></li>
      <li><a href="how-to/disaster-recovery-drill/">Yedekleme &amp; DR Restore Testi</a></li>
      <li><a href="runbooks/">Olay Müdahale (Runbooks)</a></li>
    </ul>
  </div>

</div>

!!! tip "Docker & UFW Kuralı"
    `docker-compose.yml` içinde çıplak `ports: ["3000:3000"]` yazmak Docker'ın `iptables` üzerinden **UFW'yi bypass etmesine** yol açar. Canlıya çıkmadan önce **[Docker Gateway Mimarisi](security/docker-gateway.md)** ve **[AI Denetim Kapıları](ai-dev/ai-audit-gates.md)** kontrollerinden geçin.

!!! warning "Doğrulamadan Canlıya Çıkma"
    Her kurulumun sonunda **[İlk Kurulum Protokolü](checklists/server-first-setup.md)**, her yayının öncesinde **[Go / No-Go Matrisi](checklists/prod-ready.md)** çalıştırılmalıdır.
