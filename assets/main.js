const root = document.documentElement
const $ = (s) => document.querySelector(s)
const $$ = (s) => [...document.querySelectorAll(s)]

// Dark mode toggle (initial theme is set inline in <head> to avoid a flash)
$('.theme').addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem('theme', root.dataset.theme) } catch {}
})

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

// Gallery: category filter + lightbox (only on the Gallery page)
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

  $$('.filters button').forEach((b) => b.addEventListener('click', () => {
    $$('.filters button').forEach((x) => x.setAttribute('aria-pressed', x === b))
    figs.forEach((f) => { f.hidden = b.dataset.cat !== 'All' && f.dataset.cat !== b.dataset.cat })
    shown = figs.filter((f) => !f.hidden)
    shown.forEach((f, n) => {
      f.style.setProperty('--i', Math.min(n, 8))
      f.classList.remove('in')
      void f.offsetWidth // restart the fade-up animation
      f.classList.add('in')
    })
  }))

  figs.forEach((f) => f.querySelector('button').addEventListener('click', () => {
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
