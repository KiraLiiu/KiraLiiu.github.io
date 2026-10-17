const root = document.documentElement
const $ = (s) => document.querySelector(s)
const $$ = (s) => [...document.querySelectorAll(s)]

// Dark mode toggle (initial theme is set inline in <head> to avoid a flash)
$('.theme').addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem('theme', root.dataset.theme) } catch {}
  dispatchEvent(new Event('themechange'))
})

// Travel map (home page): places come from _data/places.yml
if ($('#map') && window.L && window.places?.length) {
  const tileUrl = () => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${root.dataset.theme === 'dark' ? 'Dark' : 'Light'}_Gray_Base/MapServer/tile/{z}/{y}/{x}`
  const map = L.map('map', { scrollWheelZoom: false, worldCopyJump: true })
  const tiles = L.tileLayer(tileUrl(), { maxZoom: 16, attribution: 'Tiles &copy; Esri' }).addTo(map)
  const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#e08e6d'
  const pts = window.places.map((p) => L.circleMarker([p.lat, p.lng], {
    radius: 7, weight: 2, color: '#fff', fillColor: accent, fillOpacity: 0.95,
  }).bindPopup(p.name).addTo(map))
  map.fitBounds(L.featureGroup(pts).getBounds(), { padding: [40, 40], maxZoom: 5 })
  addEventListener('themechange', () => tiles.setUrl(tileUrl()))
}

// Fade items up as they enter the viewport, staggered among siblings
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return
  e.target.classList.add('in')
  io.unobserve(e.target)
}), { rootMargin: '0px 0px -8% 0px' })
$$('.reveal').forEach((el) => {
  el.style.setProperty('--i', Math.min([...el.parentElement.children].indexOf(el), 8))
  io.observe(el)
})

// Reading progress bar + back-to-top button
const bar = $('.progress')
const toTop = $('.to-top')
const onScroll = () => {
  const max = root.scrollHeight - innerHeight
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`
  toTop.classList.toggle('show', scrollY > 500)
}
addEventListener('scroll', onScroll, { passive: true })
onScroll()
toTop.addEventListener('click', () => scrollTo({ top: 0 }))

// Filter chips (Gallery, Publications): items carry data-cat="A|B|C"
$$('.filters').forEach((bar) => {
  const scope = bar.parentElement
  const items = [...scope.querySelectorAll('[data-cat]')].filter((el) => el.tagName !== 'BUTTON')
  bar.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b))
    items.forEach((it) => { it.hidden = b.dataset.cat !== 'All' && !it.dataset.cat.split('|').includes(b.dataset.cat) })
    scope.querySelectorAll('.year-group').forEach((g) => { g.hidden = !g.querySelector('[data-cat]:not([hidden])') })
    items.filter((it) => !it.hidden).forEach((it, n) => {
      it.style.setProperty('--i', Math.min(n, 8))
      it.classList.remove('in')
      void it.offsetWidth // restart the fade-up animation
      it.classList.add('in')
    })
  }))
})

// Gallery lightbox (only on the Gallery page)
const box = $('.lightbox')
if (box) {
  const figs = $$('.gallery figure')
  const big = box.querySelector('img')
  let shown = figs
  let i = 0
  const show = (n) => {
    i = (n + shown.length) % shown.length
    const img = shown[i].querySelector('img')
    big.src = img.src
    big.alt = img.alt
    box.querySelector('figcaption').innerHTML = shown[i].querySelector('figcaption').innerHTML
    big.animate([{ opacity: 0 }, { opacity: 1 }], 300)
  }

  figs.forEach((f) => f.querySelector('button').addEventListener('click', () => {
    shown = figs.filter((g) => !g.hidden)
    show(shown.indexOf(f))
    box.showModal()
  }))
  box.querySelector('.prev').addEventListener('click', () => show(i - 1))
  box.querySelector('.next').addEventListener('click', () => show(i + 1))
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1)
    if (e.key === 'ArrowRight') show(i + 1)
  })
  box.addEventListener('click', (e) => { if (!e.target.closest('img, button')) box.close() })
}
