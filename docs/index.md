---
hide:
  - navigation
  - toc
description: Ubuntu veya Debian sunucusunu hazırla, Docker ile uygulamanı yayınla ve canlı sistemi adım adım işlet.
---

<div class="sh-home" markdown="1">

<div class="sh-hero" markdown="1">

<div class="sh-hero__intro" markdown="1">

# Sunucunu kur,<br><span>uygulamanı yayına al.</span>

Ubuntu veya Debian sunucunu güvenli bir şekilde hazırla, Docker ile uygulamanı yayınla ve canlı sistemi adım adım işlet.

<div class="sh-hero__actions" markdown="1">

[İlk adıma başla](getting-started/roadmap.md#day-0){ .sh-btn }
[Yol haritasını gör](getting-started/roadmap.md)

</div>

</div>

<figure class="sh-topology">
  <figcaption>Yayındaki trafiğin yolu</figcaption>
  <ol class="sh-topology__flow">
    <li class="sh-topology__internet">İnternet</li>
    <li class="sh-topology__proxy">Reverse proxy <span>80 / 443</span></li>
    <li class="sh-topology__private">
      <span>Özel ağ</span>
      <ol>
        <li>Uygulama</li>
        <li>Veritabanı</li>
      </ol>
    </li>
  </ol>
  <p>Sunucu yönetimi için SSH erişimi ayrı tutulur.</p>
</figure>

</div>

## Kurulum adımları

<div class="sh-stepper" markdown="1">

<div class="sh-step" markdown="1">

<p class="sh-step__tag">Day 0</p>

### [Sunucuyu hazırla](getting-started/roadmap.md#day-0)

İlk bağlantıyı kur, SSH erişimini ve güvenlik duvarını ayarla, Docker’ı yükle.

</div>

<div class="sh-step" markdown="1">

<p class="sh-step__tag">Day 1</p>

### [Uygulamayı yayınla](getting-started/roadmap.md#day-1)

Uygulamayı özel ağda çalıştır, HTTPS erişimini kur ve yayına hazır olduğunu doğrula.

</div>

<div class="sh-step" markdown="1">

<p class="sh-step__tag">Day 2</p>

### [Canlı sistemi işlet](getting-started/roadmap.md#day-2)

Servisleri izle, yedekten geri dönmeyi test et ve kesinti anında ne yapacağını bil.

</div>

</div>

## Belirli bir iş için geldin mi?

<ul class="sh-quick" markdown="1">
<li markdown="1">
[Trafiği açmadan önce kontrol et](checklists/prod-ready.md)
<span>Canlıya geçiş kontrol listesi</span>
</li>
<li markdown="1">
[Bir kesintiye müdahale et](runbooks/index.md)
<span>Belirtiye göre olay müdahale rehberleri</span>
</li>
<li markdown="1">
[AI ile altyapıya uygun geliştir](ai-dev/index.md)
<span>Uygulama kontratları ve denetim adımları</span>
</li>
</ul>

</div>
