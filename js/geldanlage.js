import { getBeraterPublicBySlug } from './supabase.js';
import { applyBeraterBrand } from './berater-brand.js';

// Berater-Branding laden
const slug = new URLSearchParams(window.location.search).get('berater');
if (slug) {
  getBeraterPublicBySlug(slug).then(({ data }) => {
    if (!data) return;
    applyBeraterBrand(data);
    // Name in der Berater-Card setzen
    const nameEl = document.getElementById('gKontaktName');
    const roleEl = document.getElementById('gKontaktRole');
    if (nameEl && data.name) nameEl.textContent = data.name;
    if (roleEl && data.rolle) roleEl.textContent = data.rolle + ' · Deutsche Vermögensberatung';
  });
}

// Austragen-Link mit Token verknüpfen (falls Token in URL)
const token = new URLSearchParams(window.location.search).get('token');
const austragenLink = document.getElementById('gAustragenLink');
if (austragenLink && token) {
  austragenLink.href = `austragen.html?token=${encodeURIComponent(token)}`;
}

// Reveal-Animation via IntersectionObserver
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.g-reveal').forEach(el => observer.observe(el));

// Sticky-CTA einblenden nach Hero
const sticky = document.getElementById('gSticky');
const hero = document.getElementById('gHero');
if (sticky && hero) {
  new IntersectionObserver(([e]) => {
    sticky.classList.toggle('visible', !e.isIntersecting);
  }, { threshold: 0.1 }).observe(hero);
}

// SVG-Chart animieren
const chartSection = document.getElementById('gChart');
if (chartSection) {
  const paths = chartSection.querySelectorAll('[data-animate-path]');
  const chartObserver = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      paths.forEach((path, i) => {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.style.transition = `stroke-dashoffset ${1.4 + i * 0.15}s cubic-bezier(0.4,0,0.2,1) ${i * 0.1}s`;
        requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
      });
      chartObserver.disconnect();
    }
  }, { threshold: 0.3 });
  chartObserver.observe(chartSection);
}
