import './style.css'
import { supabase } from './lib/supabase'

type MenuItem = {
  id: string
  name: string
  description: string
  category: string
  price: number
  image_url: string | null
  is_available: boolean
  badge?: string | null
}

const demoMenu: MenuItem[] = [
  { id: 'demo-1', name: '炙烤和牛饭', description: '谷饲和牛 · 温泉蛋 · 秘制照烧汁', category: '主食', price: 48, image_url: null, is_available: true, badge: '人气招牌' },
  { id: 'demo-2', name: '松露蘑菇意面', description: '黑松露 · 口蘑 · 帕玛森芝士', category: '主食', price: 42, image_url: null, is_available: true, badge: '主厨推荐' },
  { id: 'demo-3', name: '香煎鸡腿沙拉', description: '低温慢煮鸡腿 · 牛油果 · 蜂蜜芥末', category: '轻食', price: 36, image_url: null, is_available: true },
  { id: 'demo-4', name: '南法番茄汤', description: '慢熬番茄 · 罗勒 · 香烤酸面包', category: '轻食', price: 22, image_url: null, is_available: true },
  { id: 'demo-5', name: '桂花乌龙冷萃', description: '凤凰单丛 · 丹桂 · 低温冷萃', category: '饮品', price: 18, image_url: null, is_available: true },
  { id: 'demo-6', name: '海盐焦糖布丁', description: '每日现烤 · 海盐焦糖 · 香草籽', category: '甜品', price: 20, image_url: null, is_available: true },
]

const art = ['rice', 'pasta', 'salad', 'soup', 'tea', 'pudding']
const icons: Record<string, string> = { 主食: '◒', 轻食: '❋', 饮品: '◉', 甜品: '✳' }
let menu: MenuItem[] = []
let cart = new Map<string, number>()
let category = '全部'
let search = ''
let drawerOpen = false
let submitting = false

const app = document.querySelector<HTMLDivElement>('#app')!
const money = (amount: number) => `¥${amount.toFixed(2)}`
const count = () => [...cart.values()].reduce((a, b) => a + b, 0)
const total = () => menu.reduce((sum, item) => sum + item.price * (cart.get(item.id) ?? 0), 0)

async function loadMenu() {
  if (supabase) {
    const { data, error } = await supabase.from('menus').select('id,name,description,category,price,image_url,is_available,badge').eq('is_available', true).order('sort_order').order('created_at')
    if (!error && data?.length) menu = data as MenuItem[]
    else if (error) console.error('菜单读取失败', error.message)
  }
  if (!menu.length) menu = demoMenu
  render()
}

function render() {
  const categories = ['全部', ...new Set(menu.map((item) => item.category))]
  const filtered = menu.filter((item) => (category === '全部' || item.category === category) && `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase()))
  app.innerHTML = `
    <header class="topbar"><a class="brand" href="#"><span class="brand-mark">拾</span><span>拾味<span class="brand-en">SHIWEI KITCHEN</span></span></a><div class="top-note"><span class="open-dot"></span> 今日营业 · 11:00—21:00</div><button class="cart-top" data-action="cart" aria-label="打开购物袋">购物袋 <span>${count()}</span></button></header>
    <main>
      <section class="hero"><div class="hero-copy"><p class="eyebrow">GOOD FOOD, GOOD MOOD</p><h1>认真吃饭，<br/><em>好好生活。</em></h1><p class="hero-sub">用当季食材，做一顿舒服的饭。</p><div class="hero-meta"><span>✦ 每日新鲜制作</span><i></i><span>⌁ 下单后约 20 分钟</span></div></div><div class="hero-art"><div class="hero-orbit"></div><div class="hero-plate"><span>今日<br/>好味</span></div><div class="hero-spark spark-a">✳</div><div class="hero-spark spark-b">✦</div><div class="hero-caption">FRESHLY MADE<br/><b>EST. 2024</b></div></div></section>
      <section class="menu-section"><div class="section-heading"><div><p class="eyebrow">FROM OUR KITCHEN</p><h2>今日菜单 <span>MENU</span></h2></div><label class="search"><span>⌕</span><input id="search" placeholder="找一道喜欢的" value="${escapeHtml(search)}" /><kbd>⌘ K</kbd></label></div>
      <div class="toolbar"><nav class="categories">${categories.map((c) => `<button class="category ${category === c ? 'active' : ''}" data-category="${escapeHtml(c)}">${c === '全部' ? '全部' : `${icons[c] ?? '✳'} ${escapeHtml(c)}`}</button>`).join('')}</nav><span class="menu-count">${filtered.length} 道美味</span></div>
      <div class="menu-grid">${filtered.map((item) => card(item)).join('') || '<div class="empty-state">没有找到这道菜，换个关键词试试。</div>'}</div></section>
      <section class="bottom-note"><span>✳</span> 用心挑选食材，也用心对待每一餐 <span>✳</span></section>
    </main>
    <footer><span>© 2026 拾味厨房</span><span>一餐一味，四季相逢</span></footer>
    <button class="cart-fab" data-action="cart"><span class="bag-icon">▱</span><span>查看点单</span><b>${count()}</b><strong>${money(total())}</strong></button>
    ${drawerOpen ? drawer() : ''}
    <div class="toast" id="toast" role="status"></div>`
  bindEvents()
}

function card(item: MenuItem) {
  const qty = cart.get(item.id) ?? 0
  const artType = art[menu.findIndex((candidate) => candidate.id === item.id) % art.length]
  return `<article class="dish-card"><div class="dish-art art-${artType}">${item.badge ? `<span class="dish-badge">✦ ${escapeHtml(item.badge)}</span>` : ''}<span class="art-symbol">${icons[item.category] ?? '✳'}</span><span class="art-orb"></span><span class="art-label">SHIWEI · ${escapeHtml(item.category)}</span></div><div class="dish-info"><div class="dish-title-row"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></div><span class="dish-price">${money(item.price)}</span></div><div class="dish-bottom"><span class="dish-category">${escapeHtml(item.category)}</span>${qty ? `<div class="stepper"><button data-action="minus" data-id="${item.id}" aria-label="减少">−</button><b>${qty}</b><button data-action="plus" data-id="${item.id}" aria-label="增加">+</button></div>` : `<button class="add-button" data-action="plus" data-id="${item.id}"><span>+</span> 加入点单</button>`}</div></div></article>`
}

function drawer() {
  const items = menu.filter((item) => cart.has(item.id))
  return `<div class="scrim" data-action="close"></div><aside class="drawer"><div class="drawer-head"><div><p class="eyebrow">YOUR SELECTION</p><h2>我的点单 <span>${count()}</span></h2></div><button class="close-button" data-action="close" aria-label="关闭">×</button></div>${items.length ? `<div class="cart-lines">${items.map((item) => `<div class="cart-line"><div class="cart-line-art art-${art[menu.findIndex((candidate) => candidate.id === item.id) % art.length]}">${icons[item.category] ?? '✳'}</div><div class="cart-line-copy"><b>${escapeHtml(item.name)}</b><span>${money(item.price)} / 份</span><div class="stepper"><button data-action="minus" data-id="${item.id}">−</button><b>${cart.get(item.id)}</b><button data-action="plus" data-id="${item.id}">+</button></div></div><strong>${money(item.price * (cart.get(item.id) ?? 0))}</strong></div>`).join('')}</div><div class="checkout"><div class="total-row"><span>合计</span><b>${money(total())}</b></div><label>怎么称呼你<input id="customer-name" placeholder="姓名" maxlength="40" /></label><label>备注（选填）<textarea id="order-note" placeholder="例如：少冰、不要香菜" maxlength="200" rows="2"></textarea></label><button class="checkout-button" data-action="checkout" ${submitting ? 'disabled' : ''}>${submitting ? '正在提交…' : '确认下单'} <span>→</span></button><small>点单后请到店内收银台付款</small></div>` : `<div class="cart-empty"><span>▱</span><h3>点单袋还是空的</h3><p>去菜单里挑几样喜欢的吧</p><button class="add-button" data-action="close">看看菜单 <span>→</span></button></div>`}</aside>`
}

function bindEvents() {
  app.querySelectorAll<HTMLElement>('[data-category]').forEach((button) => button.addEventListener('click', () => { category = button.dataset.category ?? '全部'; render() }))
  app.querySelectorAll<HTMLElement>('[data-action]').forEach((button) => button.addEventListener('click', () => handleAction(button.dataset.action ?? '', button.dataset.id)))
  app.querySelector<HTMLInputElement>('#search')?.addEventListener('input', (event) => { search = (event.target as HTMLInputElement).value; const pos = (event.target as HTMLInputElement).selectionStart; render(); const next = app.querySelector<HTMLInputElement>('#search')!; next.focus(); next.setSelectionRange(pos, pos) })
  app.querySelector<HTMLInputElement>('#customer-name')?.focus()
}

function handleAction(action: string, id?: string) {
  if (action === 'cart') drawerOpen = true
  if (action === 'close') drawerOpen = false
  if (action === 'plus' && id) cart.set(id, (cart.get(id) ?? 0) + 1)
  if (action === 'minus' && id) { const next = (cart.get(id) ?? 0) - 1; if (next <= 0) cart.delete(id); else cart.set(id, next) }
  if (action === 'checkout') { void checkout(); return }
  render()
}

async function checkout() {
  if (!count()) return
  const nameInput = app.querySelector<HTMLInputElement>('#customer-name')
  const name = nameInput?.value.trim() ?? ''
  const note = app.querySelector<HTMLTextAreaElement>('#order-note')?.value.trim() ?? ''
  if (!name) { nameInput?.focus(); showToast('请先填写怎么称呼你'); return }
  if (!supabase) { showToast('演示模式：配置 Supabase 后即可保存订单'); return }
  submitting = true
  render()
  const { data, error } = await supabase.rpc('place_order', {
    p_customer_name: name,
    p_note: note || null,
    p_items: [...cart.entries()].map(([menu_id, quantity]) => ({ menu_id, quantity })),
  })
  submitting = false
  if (error) { render(); showToast(`下单失败：${error.message}`); return }
  const orderId = data as string
  cart.clear()
  drawerOpen = false
  render()
  app.querySelector<HTMLElement>('.hero')?.scrollIntoView({ behavior: 'smooth' })
  showToast(`下单成功！订单号 ${orderId.slice(0, 8).toUpperCase()}`)
}

function showToast(message: string) {
  const toast = app.querySelector<HTMLDivElement>('#toast')
  if (!toast) return
  toast.textContent = message
  toast.classList.add('visible')
  window.setTimeout(() => toast.classList.remove('visible'), 3200)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

void loadMenu()
