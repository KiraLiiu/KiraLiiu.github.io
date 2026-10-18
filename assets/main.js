const root = document.documentElement
const $ = (s) => document.querySelector(s)
const $$ = (s) => [...document.querySelectorAll(s)]

// Dark mode toggle (initial theme is set inline in <head> to avoid a flash)
$('.theme').addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem('theme', root.dataset.theme) } catch {}
  dispatchEvent(new Event('themechange'))
})

// Reading progress bar + back-to-top button
const bar = $('.progress')
const toTop = $('.to-top')
const backdrop = $('.backdrop')
const onScroll = () => {
  const max = root.scrollHeight - innerHeight
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`
  backdrop?.style.setProperty('--p', max > 0 ? scrollY / max : 0)
  toTop.classList.toggle('show', scrollY > 500)
}
addEventListener('scroll', onScroll, { passive: true })
onScroll()
toTop.addEventListener('click', () => scrollTo({ top: 0 }))

// Fade items up as they enter the viewport, staggered among siblings
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return
  e.target.classList.add('in')
  io.unobserve(e.target)
}), { rootMargin: '0px 0px -8% 0px' })

// Background music (tracks from _data/music.yml). Off until the visitor turns it on with the sidebar
// button; the choice, track and position are remembered across visits.
const store = (s, k, v) => { try { return v === undefined ? s.getItem(k) : s.setItem(k, v) } catch {} }
const tracks = window.bgm || []
const bgmBtn = $('.bgm')
const audio = new Audio()
audio.volume = 0.35
let track = Math.max(0, tracks.findIndex((t) => t.src === store(localStorage, 'bgmTrack')))
const syncBgm = () => {
  bgmBtn?.setAttribute('aria-pressed', !audio.paused)
  $$('.tracks button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.i === track))
}
const loadTrack = (n, t = 0) => {
  track = (n + tracks.length) % tracks.length
  audio.src = t ? `${tracks[track].src}#t=${t}` : tracks[track].src
  store(localStorage, 'bgmTrack', tracks[track].src)
  syncBgm()
}
const playBgm = () => audio.play().catch(syncBgm)
if (bgmBtn && tracks.length) {
  // A full reload (link clicked while paused, typed URL) resumes from the saved position;
  // Safari may block sound then, so the button shows off and one click resumes.
  let pos = {}; try { pos = JSON.parse(store(sessionStorage, 'bgmPos')) || {} } catch {}
  loadTrack(track, pos.src === tracks[track].src ? pos.t : 0)
  if (store(localStorage, 'bgm') === 'on') playBgm()
  audio.addEventListener('play', syncBgm)
  audio.addEventListener('pause', syncBgm)
  audio.addEventListener('ended', () => { loadTrack(track + 1); playBgm() })
  addEventListener('pagehide', () => store(sessionStorage, 'bgmPos', JSON.stringify({ src: tracks[track].src, t: audio.currentTime })))
  bgmBtn.addEventListener('click', () => {
    store(localStorage, 'bgm', audio.paused ? 'on' : 'off')
    audio.paused ? playBgm() : audio.pause()
  })

  // While music plays, internal links swap the sidebar header/nav and <main> in place instead of
  // reloading the page, so the audio never stops. Paused → ordinary navigation.
  let shown = location.pathname
  const go = async (url, push) => {
    let doc
    try {
      const r = await fetch(url)
      if (!r.ok || !r.headers.get('content-type')?.includes('text/html')) throw 0
      doc = new DOMParser().parseFromString(await r.text(), 'text/html')
    } catch { location.href = url; return }
    if (push) history.pushState(null, '', url)
    shown = url.pathname
    page.abort()
    page = new AbortController()
    document.title = doc.title
    root.style.cssText = doc.documentElement.style.cssText // page hue
    root.classList.remove('intro')
    for (const s of ['.sidebar header', '.sidebar nav', 'main']) $(s).replaceWith(doc.querySelector(s))
    setBackdrop(window.backdropSet)
    for (const old of $$('main script')) { // parsed scripts never run; recreate them, in order
      const s = document.createElement('script')
      for (const a of old.attributes) s.setAttribute(a.name, a.value)
      s.text = old.text
      const loaded = s.src && new Promise((r) => { s.onload = s.onerror = r })
      old.replaceWith(s)
      await loaded
    }
    const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)))
    target ? target.scrollIntoView() : scrollTo({ top: 0 })
    $('main').focus({ preventScroll: true })
    initPage()
    onScroll()
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]')
    if (!(a instanceof HTMLAnchorElement) || audio.paused || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute('download')) return
    const url = new URL(a.href)
    if (url.origin !== location.origin || url.pathname === location.pathname || /\.(?!html?$)\w+$/.test(url.pathname)) return
    e.preventDefault()
    go(url, true)
  })
  addEventListener('popstate', () => { if (location.pathname !== shown) go(new URL(location), false) })
}

// Everything below is per page; it runs again after an in-place page swap.
// `page.signal` removes window listeners and timers that belong to the page being left.
let page = new AbortController()
function initPage() {
  const { signal } = page

  // Travel map (home page): places come from _data/places.yml
  if ($('#map') && window.L && window.places?.length) {
    const tileUrl = () => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${root.dataset.theme === 'dark' ? 'Dark' : 'Light'}_Gray_Base/MapServer/tile/{z}/{y}/{x}`
    const map = L.map('map', { scrollWheelZoom: false, worldCopyJump: true })
    const tiles = L.tileLayer(tileUrl(), { maxZoom: 16, attribution: 'Tiles &copy; Esri' }).addTo(map)
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#e08e6d'
    // Reference layer under the dots: nominal 15° time-zone bands, continent and ocean names
    // ponytail: nominal bands only, real zone borders (China all UTC+8, India +5:30…) need a multi-MB GeoJSON
    map.createPane('ref').style.zIndex = 350
    const text = (latlng, html, cls) => L.marker(latlng, { pane: 'ref', interactive: false, keyboard: false,
      icon: L.divIcon({ className: `geo-label ${cls}`, html: `<span>${html}</span>`, iconSize: [0, 0] }) }).addTo(map)
    for (let lng = -172.5; lng <= 172.5; lng += 15) L.polyline([[-85, lng], [85, lng]], { pane: 'ref', className: 'tz', interactive: false }).addTo(map)
    const tz = []
    for (let n = -11; n <= 12; n++) tz.push(text([0, n * 15], n ? `UTC${n > 0 ? '+' : '−'}${Math.abs(n)}` : 'UTC', 'tz-label'))
    map.on('move', () => tz.forEach((m) => m.setLatLng([map.getBounds().getNorth(), m.getLatLng().lng])))
    ;[['North America', 55, -98], ['South America', -15, -60], ['Europe', 54, 8], ['Africa', 5, 20],
      ['Asia', 58, 95], ['Oceania', -25, 135], ['Antarctica', -78, 20]].forEach(([s, lat, lng]) => text([lat, lng], s, 'continent'))
    ;[['Pacific<br>Ocean', 2, -118], ['Pacific<br>Ocean', 24, 147], ['Atlantic Ocean', 25, -42], ['Indian Ocean', -20, 78],
      ['Arctic Ocean', 80, 0], ['Southern Ocean', -62, 60]].forEach(([s, lat, lng]) => text([lat, lng], s, 'ocean'))
    // Hover shows the name; click opens a card with the Wikipedia intro + photo (fetched once) and a Google Maps link
    const langs = { China: 'zh-CN', Taiwan: 'zh-TW', Japan: 'ja', Germany: 'de', Austria: 'de', Russia: 'ru', Italy: 'it', 'Vatican City': 'it' }
    const pts = window.places.map((p) => {
      const en = p.name === p.country ? p.name : `${p.name}, ${p.country}`
      const title = `${en}${p.note ? ` (${p.note})` : ''}${p.local ? `<br><span class="local" lang="${langs[p.country] || ''}">${p.local}</span>` : ''}`
      // Wikipedia redirects "City, ST" for US places; elsewhere the city alone is the article title
      const wikiTitle = p.wiki || (p.country === 'United States' ? p.name : p.name.split(',')[0])
      const card = document.createElement('div')
      card.className = 'place'
      card.innerHTML = `<strong>${title}</strong><p>Loading…</p><span><a class="gmap" target="_blank" rel="noopener">Google Maps ↗</a></span>`
      card.querySelector('.gmap').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(en)}`
      return L.circleMarker([p.lat, p.lng], {
        radius: 7, weight: 2, color: '#fff', fillColor: accent, fillOpacity: 0.95,
      }).bindTooltip(title, { direction: 'top', offset: [0, -6] })
        .bindPopup(card, { minWidth: 240, maxWidth: 260 })
        .on('popupopen', (e) => e.target.closeTooltip())
        .once('popupopen', ({ popup }) => {
          fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle.replaceAll(' ', '_'))}`)
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((d) => {
              card.querySelector('p').textContent = d.extract
              if (d.thumbnail) {
                const img = new Image()
                img.src = d.thumbnail.source
                img.alt = d.title
                img.onload = () => popup.update()
                card.prepend(img)
              }
              const wiki = document.createElement('a')
              wiki.href = d.content_urls.desktop.page
              wiki.target = '_blank'
              wiki.rel = 'noopener'
              wiki.textContent = 'Wikipedia ↗'
              card.querySelector('span').append(wiki)
            })
            .catch(() => card.querySelector('p').remove())
            .finally(() => popup.update())
        })
        .addTo(map)
    })
    map.fitBounds(L.featureGroup(pts).getBounds(), { padding: [40, 40], maxZoom: 5 })
    addEventListener('themechange', () => tiles.setUrl(tileUrl()), { signal })
  }

  $$('.reveal').forEach((el) => {
    el.style.setProperty('--i', Math.min([...el.parentElement.children].indexOf(el), 8))
    io.observe(el)
  })

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

  // Background set picker (Gallery): remember the choice and switch right away
  const setBtns = $$('.sets button[data-set]')
  const markSet = () => setBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.set === window.backdropSet))
  setBtns.forEach((b) => b.addEventListener('click', () => {
    try { localStorage.setItem('backdropSet', b.dataset.set) } catch {}
    setBackdrop(b.dataset.set)
    markSet()
  }))
  markSet()

  // Background music track picker (Music page)
  if (tracks.length) {
    $$('.tracks button').forEach((b) => b.addEventListener('click', () => {
      store(localStorage, 'bgm', 'on')
      if (+b.dataset.i !== track) loadTrack(+b.dataset.i)
      playBgm()
    }))
    syncBgm()
  }

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

  // Music: crossfade photo slideshows
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) $$('.slides').forEach((el) => {
    const figs = [...el.children]
    if (figs.length < 2) return
    let i = 0
    const id = setInterval(() => { figs[i].classList.remove('on'); i = (i + 1) % figs.length; figs[i].classList.add('on') }, 5000)
    signal.addEventListener('abort', () => clearInterval(id))
  })
}
initPage()
