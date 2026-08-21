/* ================================================================
   STATE
   ================================================================ */
const API_BASE = window.API_BASE || 'https://myguy.pythonanywhere.com';

const state = {
  user: null,
  transactions: [],
  proofs: [],
  products: [],
  ads: [],
  plans: {},
  adFrequencies: {},
  perImpression: 5,
  ui: {
    activeView: 'overview',
    txFilter: 'all',
    productFilter: 'all'
  }
};

const SESSION_KEY = 'myguy-vendor-session';

function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    user: state.user,
    products: state.products,
    transactions: state.transactions,
    proofs: state.proofs,
    ads: state.ads,
    plans: state.plans,
    adFrequencies: state.adFrequencies,
    perImpression: state.perImpression
  }));
}

function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (saved && saved.user) Object.assign(state, saved);
  } catch (e) {
    localStorage.removeItem(SESSION_KEY);
  }
}

/* ================================================================
   THEME
   ================================================================ */
function initTheme() {
  const saved = localStorage.getItem('myguy-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('myguy-theme', next);
  renderThemeToggleLabel();
}

function renderThemeToggleLabel() {
  document.querySelectorAll('.theme-toggle .tt-label').forEach(el => {
    el.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '🌙 Night market' : '☀️ Day market';
  });
}

/* ================================================================
   TOASTS
   ================================================================ */
function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '⚠️', info: '💬' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="ic">${icons[type] || ''}</span><span>${escapeHtml(message)}</span>`;
  document.getElementById('toast-stack').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 200); }, 3800);
}

/* ================================================================
   MODAL SYSTEMS
   ================================================================ */
function openModal({ title, body, confirmText = 'Confirm', cancelText = 'Cancel', danger = false, hideCancel = false }) {
  return new Promise(resolve => {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-backdrop show" id="active-modal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-head"><h3>${title}</h3></div>
          <div class="modal-body">${body}</div>
          <div class="modal-foot">
            ${hideCancel ? '' : `<button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>`}
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirmText}</button>
          </div>
        </div>
      </div>`;
    const backdrop = document.getElementById('active-modal');
    const close = (val) => { root.innerHTML = ''; resolve(val); };
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(false); });
    document.getElementById('modal-confirm').onclick = () => close(true);
    const cancelBtn = document.getElementById('modal-cancel');
    if (cancelBtn) cancelBtn.onclick = () => close(false);
    const escHandler = (e) => { if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  });
}

function closeCustomModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('show');
}

function closeLightbox(e) {
  if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) {
    document.getElementById('lightbox').classList.remove('show');
  }
}

/* ================================================================
   HELPERS
   ================================================================ */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function naira(n) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });
}

function emptyState(icon, title, body) {
  return `<div class="empty"><div class="ic">${icon}</div><h4>${title}</h4><p>${body}</p></div>`;
}

function timeAgo(iso) {
  if (!iso) return '-';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

async function copyText(text, label = 'Copied to clipboard') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(label, 'success');
  } catch (e) {
    showToast('Could not copy — copy it manually', 'error');
  }
}

/* ================================================================
   IMAGE COMPRESSION (fix for mobile uploads)
   ================================================================ */
function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/* ================================================================
   API CLIENT (token auth fallback for mobile Chrome/Safari
   cross-site cookie blocking, plus credentials: 'include')
   ================================================================ */
const API = {
  async request(url, options = {}) {
    const fullUrl = API_BASE + url;
    const token = localStorage.getItem('myguy-token');
    const cfg = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options
    };
    if (options.body instanceof FormData) delete cfg.headers['Content-Type'];
    if (token) cfg.headers['Authorization'] = 'Bearer ' + token;

    try {
      const res = await fetch(fullUrl, cfg);
      const data = await res.json();

      // If the response indicates failure, throw with the server message
      if (!res.ok && data.error) {
        throw new Error(data.error);
      }
      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      return data;
    } catch (err) {
      // Re-throw with a clear message
      throw new Error(err.message || 'Network error – please check your connection');
    }
  },
  login: (email, password) => API.request('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (data) => API.request('/api/signup', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => API.request('/api/logout', { method: 'POST' }),
  getDashboard: () => API.request('/api/dashboard'),
  topUp: (fd) => API.request('/api/wallet/topup', { method: 'POST', body: fd }),
  activatePlan: (plan) => API.request('/api/wallet/plan', { method: 'POST', body: JSON.stringify({ plan }) }),
  addProduct: (fd) => API.request('/api/products/add', { method: 'POST', body: fd }),
  deleteProduct: (id) => API.request(`/api/products/delete/${id}`, { method: 'POST' }),
  toggleProduct: (id) => API.request(`/api/products/toggle/${id}`, { method: 'POST' }),
  addAd: (fd) => API.request('/api/ads/create', { method: 'POST', body: fd }),
  toggleAd: (id) => API.request(`/api/ads/toggle/${id}`, { method: 'POST' }),
  deleteAd: (id) => API.request(`/api/ads/delete/${id}`, { method: 'POST' }),
  updateProfile: (data) => API.request('/api/profile/update', { method: 'POST', body: JSON.stringify(data) }),
  passwordReset: (data) => API.request('/api/password-reset', { method: 'POST', body: JSON.stringify(data) })
};

/* ================================================================
   ROUTER
   ================================================================ */
const Router = {
  routes: {},
  add(path, handler) { this.routes[path] = handler; },
  navigate(path, data = null) {
    const handler = this.routes[path];
    if (handler) {
      handler(data);
      window.history.pushState({ path, data }, '', path);
    }
  },
  init() {
    window.addEventListener('popstate', e => { if (e.state) this.navigate(e.state.path, e.state.data); });
    const path = window.location.pathname;
    this.navigate(this.routes[path] ? path : '/login');
  }
};

/* ================================================================
   AUTH PAGES
   ================================================================ */
function authShell({ eyebrow, headline, pitch, ticker, formHtml }) {
  return `
  <div class="auth-shell">
    <div class="auth-brand">
      <div class="mark">
        <img src="/static/logo.png" alt="My Guy" class="brand-logo">
        <span>My Guy</span>
      </div>
      <div class="pitch">
        <span class="eyebrow">${eyebrow}</span>
        <h1>${headline}</h1>
        <p>${pitch}</p>
      </div>
      <div class="ticker">${ticker}</div>
    </div>
    <div class="auth-form-side">
      <div class="auth-card">${formHtml}</div>
    </div>
  </div>`;
}

const Pages = {
  login() {
    document.getElementById('app').innerHTML = authShell({
      eyebrow: 'Vendor & Store Portal',
      headline: 'Sell your products<br>directly on WhatsApp.',
      pitch: 'List your products, get discovered by thousands of shoppers, and manage your store inventory.',
      ticker: `<span>Free to list</span><span>Pay per impression</span><span>Weekly plans from ₦500</span>`,
      formHtml: `
        <h2>Vendor Sign In</h2>
        <p class="subtitle">Access your store dashboard</p>
        <div class="banner banner-error" id="login-banner"></div>
        <form id="login-form" onsubmit="return handleLogin(event)">
          <div class="field">
            <label>Email address</label>
            <input class="input" type="email" id="login-email" required placeholder="vendor@example.com">
          </div>
          <div class="field">
            <label>Password</label>
            <div class="input-wrap">
              <input class="input" type="password" id="login-password" required placeholder="Your password">
              <button type="button" class="input-toggle" onclick="togglePw('login-password',this)">Show</button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="login-submit">Sign in</button>
        </form>
        <div style="text-align:center; margin-top:20px; font-size:.85em; display:flex; flex-direction:column; gap:10px;">
          <div>New Vendor? <a href="#" style="color:var(--primary); font-weight:600;" onclick="Router.navigate('/signup')">Register your store</a></div>
          <div>Are you a Brand/Advertiser? <a href="/brand" style="color:var(--primary); font-weight:600;">Go to Brand Portal →</a></div>
          <div class="divider" style="margin: 8px 0;"></div>
          <div>Forgot password? <a href="#" style="color:var(--accent); font-weight:600;" onclick="contactWhatsAppSupport()">Contact support on WhatsApp</a></div>
        </div>`
    });
  },

  signup() {
    document.getElementById('app').innerHTML = authShell({
      eyebrow: 'Store Account',
      headline: 'Register your Store<br>and start selling.',
      pitch: 'Create your vendor account, list products, and reach customers via WhatsApp.',
      ticker: `<span>Free registration</span><span>Pay per lead</span><span>Weekly plans from ₦500</span>`,
      formHtml: `
        <h2>Vendor Registration</h2>
        <p class="subtitle">Fill the fields below to register</p>
        <div class="banner banner-error" id="signup-banner"></div>
        <form id="signup-form" onsubmit="return handleSignup(event)">
          <div class="field">
            <label>Business/Store Name</label>
            <input class="input" type="text" id="signup-business-name" required placeholder="e.g. Lagos Fashion Store">
          </div>
          <div class="field">
            <label>WhatsApp Number</label>
            <input class="input" type="text" id="signup-phone" required placeholder="2348012345678">
            <div class="hint">Includes country code. E.g. 23480...</div>
          </div>
          <div class="field">
            <label>Email address</label>
            <input class="input" type="email" id="signup-email" required placeholder="vendor@example.com">
          </div>
          <div class="field">
            <label>Password</label>
            <div class="input-wrap">
              <input class="input" type="password" id="signup-password" required placeholder="Min 6 characters" minlength="6">
              <button type="button" class="input-toggle" onclick="togglePw('signup-password',this)">Show</button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="signup-submit">Register store</button>
        </form>
        <div class="faint" style="text-align:center;margin-top:18px;">
          Already have an account? <a href="#" style="color:var(--primary);font-weight:600;" onclick="Router.navigate('/login')">Sign in</a>
        </div>`
    });
  }
};

function togglePw(id, btn) {
  const input = document.getElementById(id);
  const isPw = input.type === 'password';
  input.type = isPw ? 'text' : 'password';
  btn.textContent = isPw ? 'Hide' : 'Show';
}

function showBanner(id, message) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

/* ================================================================
   WHATSAPP SUPPORT
   ================================================================ */
function contactWhatsAppSupport() {
  const phoneNumber = '08105517662';
  const message = 'Hello, I need help with my My Guy vendor account.';
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/* ================================================================
   AUTH ACTION HANDLERS
   ================================================================ */
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Signing in…';
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const data = await API.login(email, password);
    if (data.success) {
      if (data.user.role === 'brand') {
        showToast('Brand account. Redirecting to Brand Portal...', 'info');
        setTimeout(() => { window.location.href = '/brand'; }, 1000);
        return;
      }
      if (data.token) localStorage.setItem('myguy-token', data.token);
      Object.assign(state, {
        user: data.user,
        products: data.products || [],
        transactions: data.transactions || [],
        proofs: data.proofs || [],
        ads: data.ads || [],
        plans: data.plans || {},
        adFrequencies: data.ad_frequencies || {},
        perImpression: data.per_impression || 5
      });
      saveSession();
      showToast(`Welcome back, ${data.user.business_name}!`, 'success');
      Router.navigate('/dashboard');
    } else {
      showBanner('login-banner', data.error || 'Login failed');
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  } catch (err) {
    showBanner('login-banner', err.message || 'Connection error. Please try again.');
    btn.disabled = false; btn.textContent = 'Sign in';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Creating…';
  const data = {
    role: 'vendor',
    business_name: document.getElementById('signup-business-name').value,
    email: document.getElementById('signup-email').value,
    phone: document.getElementById('signup-phone').value,
    password: document.getElementById('signup-password').value,
  };
  try {
    const res = await API.signup(data);
    if (res.success) {
      showToast('Store registered! Log in to continue.', 'success');
      Router.navigate('/login');
    } else {
      showBanner('signup-banner', res.error || 'Signup failed');
      btn.disabled = false; btn.textContent = 'Register store';
    }
  } catch (err) {
    showBanner('signup-banner', err.message || 'Connection error. Please try again.');
    btn.disabled = false; btn.textContent = 'Register store';
  }
}

async function handleLogout() {
  try { await API.logout(); } catch (e) {}
  localStorage.removeItem('myguy-token');
  localStorage.removeItem(SESSION_KEY);
  state.user = null;
  state.products = [];
  state.transactions = [];
  state.proofs = [];
  state.ads = [];
  showToast('Signed out successfully', 'info');
  Router.navigate('/login');
}

/* ================================================================
   VENDOR DASHBOARD SHELL
   ================================================================ */
function shellHtml({ navItems, activeKey, topbarRight, contentHtml }) {
  const navHtml = navItems.map(n => `
    <button class="nav-item ${n.key === activeKey ? 'active' : ''}" onclick="${n.onClick}">
      <span class="ic">${n.icon}</span><span>${n.label}</span>
      ${n.badge ? `<span class="badge">${n.badge}</span>` : ''}
    </button>`).join('');
  return `
  <div class="shell">
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <img src="/static/logo.png" alt="My Guy" class="brand-logo brand-logo-small">
        <span>My Guy</span>
      </div>
      <nav>${navHtml}</nav>
      <div class="foot">
        <button class="theme-toggle" onclick="toggleTheme()"><span class="tt-label">Theme</span> ⇄</button>
      </div>
    </aside>
    <div class="main">
      <div class="topbar">
        <button class="hamburger" onclick="openSidebar()">☰</button>
        <div style="font-weight: 700; color: var(--accent); font-size: 1.1em;">Vendor Dashboard</div>
        <div class="topbar-right">${topbarRight.right || ''}</div>
      </div>
      <div class="view">${contentHtml}</div>
    </div>
  </div>`;
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

Pages.dashboard = function () {
  if (!state.user) { Router.navigate('/login'); return; }
  const view = state.ui.activeView;
  const pendingProofs = (state.proofs || []).filter(p => p.status === 'pending').length;

  const navItems = [
    { key: 'overview', icon: '📊', label: 'Overview', onClick: "switchVendorView('overview')" },
    { key: 'products', icon: '📦', label: 'My Products', onClick: "switchVendorView('products')" },
    { key: 'add-product', icon: '➕', label: 'Add Product', onClick: "switchVendorView('add-product')" },
    { key: 'ads', icon: '📢', label: 'My Ads', onClick: "switchVendorView('ads')" },
    { key: 'topup', icon: '⬆️', label: 'Top Up', onClick: "switchVendorView('topup')" },
    { key: 'plan', icon: '📋', label: 'Subscription Plan', onClick: "switchVendorView('plan')" },
    { key: 'transactions', icon: '📜', label: 'Ledger', onClick: "switchVendorView('transactions')" },
    { key: 'proofs', icon: '🧾', label: 'Payment Proofs', onClick: "switchVendorView('proofs')", badge: pendingProofs || null },
    { key: 'profile', icon: '👤', label: 'Profile', onClick: "switchVendorView('profile')" },
  ];

  const html = shellHtml({
    activeKey: view, navItems,
    topbarRight: {
      right: `
        <div class="wallet-pill">💰 ${naira(state.user.wallet_balance)}</div>
        <div class="avatar" style="background:var(--accent); color:var(--accent-ink);" title="${escapeHtml(state.user.business_name)}">${initials(state.user.business_name)}</div>
        <button class="btn btn-ghost btn-sm" onclick="handleLogout()">Log out</button>`
    },
    contentHtml: `<div id="vendor-view-root"></div>`
  });
  document.getElementById('app').innerHTML = html;
  renderThemeToggleLabel();
  renderVendorView();
};

function switchVendorView(key) {
  state.ui.activeView = key;
  renderVendorView();
}

function renderVendorView() {
  const root = document.getElementById('vendor-view-root');
  const view = state.ui.activeView;
  const renderers = {
    overview: vendorOverviewView,
    products: vendorProductsView,
    'add-product': vendorAddProductView,
    ads: vendorAdsView,
    topup: vendorTopupView,
    plan: vendorPlanView,
    transactions: vendorTransactionsView,
    proofs: vendorProofsView,
    profile: vendorProfileView
  };
  root.innerHTML = renderers[view] ? renderers[view]() : '';

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const idx = ['overview', 'products', 'add-product', 'ads', 'topup', 'plan', 'transactions', 'proofs', 'profile'].indexOf(view);
  const navEls = document.querySelectorAll('.sidebar .nav-item');
  if (navEls[idx]) navEls[idx].classList.add('active');

  if (view === 'add-product') setupDropzone('product-image', 'product-dz');
  if (view === 'topup') setupDropzone('topup-proof', 'topup-dz');
  if (view === 'ads' && vendorCanRunAds() && (state.ads || []).length < 3) setupDropzone('ad-image', 'ad-dz');
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ================================================================
   VENDOR VIEW MARKUPS
   ================================================================ */
function vendorOverviewView() {
  const u = state.user;
  const products = state.products || [];
  const activeProducts = products.filter(p => p.active).length;
  const ads = state.ads || [];
  const activeAds = ads.filter(a => a.status === 'approved' && a.automation_active).length;
  const txs = (state.transactions || []).slice(0, 10);

  return `
    <div class="view-head">
      <div>
        <h1>Welcome, ${escapeHtml(u.business_name)} 👋</h1>
        <div class="sub">Vendor ID: <span class="num" style="font-weight: 700; color: var(--accent);">${escapeHtml(u.unique_id)}</span></div>
      </div>
    </div>

    <div class="grid grid-4">
      <div class="stat-card"><span class="ic">💰</span><div class="label">Wallet Balance</div><div class="value">${naira(u.wallet_balance)}</div><div class="delta">${state.perImpression} per impression</div></div>
      <div class="stat-card"><span class="ic">📦</span><div class="label">Products Listed</div><div class="value">${products.length}</div><div class="delta">${activeProducts} active</div></div>
      <div class="stat-card"><span class="ic">📢</span><div class="label">Ad Campaigns</div><div class="value">${ads.length}</div><div class="delta">${activeAds} active</div></div>
      <div class="stat-card">
        <span class="ic">📋</span>
        <div class="label">Active Plan</div>
        <div class="value" style="font-size: 1.25em; margin-top: 12px;">
          ${u.active_plan ? `<span class="badge badge-plan">${u.active_plan.toUpperCase()}</span>` : '<span class="badge badge-none">None</span>'}
        </div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top: 18px;">
      <div class="card">
        <h3>Quick Actions</h3>
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:12px;">
          <button class="btn btn-primary" onclick="switchVendorView('add-product')">➕ Add Product</button>
          <button class="btn btn-money" onclick="switchVendorView('topup')">⬆️ Top Up Wallet</button>
          <button class="btn btn-secondary" onclick="switchVendorView('plan')">📋 View Plans</button>
        </div>
      </div>

      <div class="card">
        <h3>Recent Ledger Activity</h3>
        ${txs.length ? `
          <div class="table-wrap" style="margin-top: 10px;">
            <table>
              <tbody>
                ${txs.map(t => `
                  <tr>
                    <td>${(t.created_at || '').slice(0, 10)}</td>
                    <td>${escapeHtml(t.description)}</td>
                    <td class="${t.amount < 0 ? 'amount-neg' : 'amount-pos'}">${t.amount < 0 ? '-' : '+'}${naira(Math.abs(t.amount))}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        ` : emptyState('📭', 'No ledger activity', 'Top up your wallet to start listing products.')}
      </div>
    </div>
  `;
}

/* -------- product management -------- */
function vendorProductsView() {
  let list = [...(state.products || [])];
  if (state.ui.productFilter === 'active') list = list.filter(p => p.active);
  if (state.ui.productFilter === 'inactive') list = list.filter(p => !p.active);

  return `
    <div class="view-head"><div><h1>My Products</h1><div class="sub">${state.products.length} products in your catalog.</div></div></div>
    <div class="toolbar">
      <select class="input" onchange="state.ui.productFilter=this.value; renderVendorView();">
        <option value="all">All Products</option>
        <option value="active" ${state.ui.productFilter === 'active' ? 'selected' : ''}>Active Only</option>
        <option value="inactive" ${state.ui.productFilter === 'inactive' ? 'selected' : ''}>Hidden Only</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="switchVendorView('add-product')">➕ Add Product</button>
    </div>
    ${list.length ? `
      <div class="grid grid-2">
        ${list.map(p => `
          <div class="card" style="display:flex; gap:16px; align-items:flex-start;">
            <img src="${API_BASE}/static/uploads/products/${p.image}" alt="${escapeHtml(p.title)}" style="width:80px; height:80px; object-fit:cover; border-radius:var(--radius-sm); flex-shrink:0;" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect fill=%22%23f0f0f0%22 width=%2280%22 height=%2280%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2230%22>📦</text></svg>'">
            <div style="flex:1; min-width:0;">
              <div class="flex-between">
                <h4 style="margin:0; font-size:1rem;">${escapeHtml(p.title)}</h4>
                <span class="badge ${p.active ? 'badge-ok' : 'badge-off'}">${p.active ? 'Active' : 'Hidden'}</span>
              </div>
              <div class="num" style="font-weight:700; color:var(--primary-dark);">${naira(p.price)}</div>
              <div class="faint" style="font-size:0.8rem;">Keywords: ${escapeHtml(p.keywords || 'None')}</div>
              <div class="faint" style="font-size:0.75rem;">Shown ${p.times_shown || 0} times</div>
              <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
                <button class="btn btn-xs ${p.active ? 'btn-ghost' : 'btn-money'}" onclick="handleToggleProduct('${p.id}')">${p.active ? 'Hide' : 'Show'}</button>
                <button class="btn btn-danger btn-xs" onclick="handleDeleteProduct('${p.id}','${escapeHtml(p.title)}')">Delete</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
    ` : emptyState('📦', 'No products listed', 'Add your first product to start selling on WhatsApp.')}`;
}

async function handleToggleProduct(pid) {
  try {
    const data = await API.toggleProduct(pid);
    if (data.success) {
      showToast('Product visibility updated', 'success');
      await refreshDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Action failed', 'error');
  }
}

async function handleDeleteProduct(pid, title) {
  const ok = await openModal({
    title: `Delete "${title}"?`,
    body: 'This action cannot be undone. Are you sure?',
    confirmText: 'Delete Product',
    danger: true
  });
  if (!ok) return;
  try {
    const data = await API.deleteProduct(pid);
    if (data.success) {
      showToast('Product deleted successfully', 'success');
      await refreshDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Action failed', 'error');
  }
}

/* -------- add product -------- */
function vendorAddProductView() {
  const u = state.user;
  const kwLimit = state.plans && state.plans[u.active_plan] ? state.plans[u.active_plan].keywords_limit : 5;

  return `
    <div class="view-head"><div><h1>Add New Product</h1><div class="sub">List your product to reach WhatsApp shoppers.</div></div></div>
    <div class="card" style="max-width:640px;">
      <form id="add-product-form" onsubmit="return handleAddProduct(event)">
        <div class="field"><label>Product Title</label><input class="input" id="product-title" required placeholder="e.g. Men's Classic Leather Sneakers"></div>
        <div class="field"><label>Description</label><textarea class="input" id="product-description" rows="3" placeholder="Describe your product..."></textarea></div>
        <div class="field"><label>Price (₦)</label><input class="input" type="number" id="product-price" required placeholder="5000" min="0"></div>
        <div class="field">
          <label>Keywords <span class="faint">(comma separated, max ${kwLimit})</span></label>
          <input class="input" id="product-keywords" placeholder="e.g. sneakers, shoes, leather, men" maxlength="${kwLimit * 20}">
          <div class="hint">These help customers find your product. You can add up to ${kwLimit} keywords on your current plan.</div>
        </div>
        <div class="field">
          <label>Product Image</label>
          <div class="dropzone" id="product-dz">
            <input type="file" id="product-image" accept="image/*" required>
            <div class="dz-ic">🖼️</div>
            <div class="dz-text">Drop product image here</div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-full" id="product-submit">List Product</button>
      </form>
    </div>`;
}

async function handleAddProduct(e) {
  e.preventDefault();
  const btn = document.getElementById('product-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Processing…';

  try {
    // Get the file input
    const fileInput = document.getElementById('product-image');
    let imageFile = fileInput.files[0];
    
    // Compress image if it's a photo (large file)
    if (imageFile && imageFile.size > 500 * 1024) { // >500KB
      try {
        imageFile = await compressImage(imageFile, 1200, 1200, 0.7);
      } catch (compressErr) {
        console.warn('Image compression failed, using original:', compressErr);
        // Continue with original file
      }
    }

    const fd = new FormData();
    fd.append('title', document.getElementById('product-title').value);
    fd.append('description', document.getElementById('product-description').value);
    fd.append('price', document.getElementById('product-price').value);
    fd.append('keywords', document.getElementById('product-keywords').value);
    fd.append('image', imageFile);

    const data = await API.addProduct(fd);
    if (data.success) {
      showToast('Product listed successfully!', 'success');
      await refreshDashboard();
      switchVendorView('products');
    } else {
      showToast(data.error || 'Failed to list product', 'error');
      btn.disabled = false; btn.textContent = 'List Product';
    }
  } catch (err) {
    showToast(err.message || 'Failed to list product – please try again', 'error');
    btn.disabled = false; btn.textContent = 'List Product';
  }
}

/* -------- ads -------- */
function vendorCanRunAds() {
  const u = state.user;
  return u.active_plan && ['boost', 'prime'].includes(u.active_plan) && u.plan_expiry && new Date(u.plan_expiry) > new Date();
}

function vendorAdsView() {
  const u = state.user;
  const ads = state.ads || [];
  const atLimit = ads.length >= 3;

  if (!vendorCanRunAds()) {
    return `
      <div class="view-head"><div><h1>My Ads</h1><div class="sub">Run up to 3 broadcast ads to WhatsApp shoppers.</div></div></div>
      <div class="card" style="border-color: var(--accent); padding: 30px; text-align: center;">
        <span style="font-size: 3em;">📋</span>
        <h3 style="justify-content: center; margin-top: 15px;">Boost or Prime plan required</h3>
        <p class="muted" style="margin: 10px auto 20px; max-width: 440px;">Only vendors on an active Boost or Prime plan can run ads. Upgrade in the <b>Subscription Plan</b> tab.</p>
        <button class="btn btn-primary" onclick="switchVendorView('plan')">View Plans</button>
      </div>`;
  }

  return `
    <div class="view-head"><div><h1>My Ads</h1><div class="sub">${ads.length}/3 ads created. New ads need admin approval before they go live.</div></div></div>
    <div class="grid grid-2">
      <div class="card">
        <h3>${atLimit ? 'Ad limit reached' : 'Create and pay for Ad'}</h3>
        ${atLimit ? `
          <p class="muted" style="margin-top:10px;">You've created the maximum of 3 ads. Delete one to create a different one.</p>
        ` : `
          <form id="add-ad-form" onsubmit="return handleCreateAd(event)">
            <div class="field"><label>Ad Title</label><input class="input" id="ad-title" required placeholder="Weekend Sneaker Sale" maxlength="80"></div>
            <div class="field"><label>Broadcast Message</label><textarea class="input" id="ad-message" rows="4" required placeholder="Tell WhatsApp shoppers about your promo." maxlength="400"></textarea></div>
            <div class="field">
              <label>Ad Type</label>
              <select class="input" id="ad-type" onchange="calculateAdCost()">
                <option value="reach">Reach ad (Plain broadcast) - ₦10/person</option>
                <option value="spotlight">Spotlight ad (Broadcast + AI-crafted mention) - ₦15/person</option>
              </select>
            </div>
            <div class="field">
              <label>Weekly reach commitment (min 100)</label>
              <input class="input" type="number" id="ad-reach" value="100" min="100" required oninput="calculateAdCost()">
            </div>
            <div class="field">
              <label>Ad image <span class="faint">(optional)</span></label>
              <div class="dropzone" id="ad-dz">
                <input type="file" id="ad-image" accept="image/*">
                <div class="dz-ic">🖼️</div>
                <div class="dz-text">Browse ad photo</div>
              </div>
            </div>
            <div class="receipt" style="padding: 16px; margin-bottom: 18px; border-style: dashed;">
              <div class="flex-between">
                <span>Rate:</span><span id="ad-cost-rate">₦10 / person</span>
              </div>
              <div class="flex-between" style="font-weight: 700; margin-top: 5px;">
                <span>Total Cost (debit):</span><span id="ad-cost-total">₦1,000.00</span>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-full" id="ad-submit">Pay upfront & submit ad</button>
          </form>
        `}
      </div>

      <div class="card">
        <h3>Your Ad Campaigns</h3>
        <div style="max-height: 580px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
          ${ads.length ? ads.map(adCardHtml).join('') : emptyState('📢', 'No ads created', 'Create an ad campaign on the left.')}
        </div>
      </div>
    </div>
  `;
}

function adCardHtml(a) {
  const statusBadge = a.status === 'approved' ? 'badge-ok' : a.status === 'pending' ? 'badge-wait' : 'badge-off';
  const autoLabel = a.automation_active ? '🟢 Running' : '⏸️ Stopped';
  return `
    <div class="card" style="padding: 14px;">
      <div class="flex-between">
        <h4 style="font-size: 1.02em;">${escapeHtml(a.title)}</h4>
        <span class="badge ${statusBadge}">${a.status.toUpperCase()}</span>
      </div>
      <p class="muted" style="font-size: .88em; margin: 8px 0; line-height: 1.4;">${escapeHtml(a.message)}</p>
      <div class="faint" style="margin-bottom: 8px;">
        Type: <b>${escapeHtml(a.ad_type.toUpperCase())}</b> · Target: <b>${a.weekly_reach}</b> people (paid <b>${naira(a.total_cost)}</b>)
      </div>
      <div class="flex-between" style="border-top: 1px dashed var(--line); padding-top: 10px; margin-top: 10px;">
        <span class="faint">Sent: <b>${a.times_sent || 0} times</b> · Automation: <b>${autoLabel}</b></span>
        <div style="display:flex; gap:6px;">
          ${a.status === 'approved' ? `
            <button class="btn btn-ghost btn-xs" onclick="handleAdToggle('${a.id}')">${a.automation_active ? 'Stop' : 'Start'}</button>
          ` : ''}
          ${a.status !== 'approved' || !a.automation_active ? `
            <button class="btn btn-danger btn-xs" onclick="handleDeleteAd('${a.id}','${escapeHtml(a.title)}')">Delete</button>
          ` : ''}
        </div>
      </div>
    </div>`;
}

function calculateAdCost() {
  const type = document.getElementById('ad-type').value;
  const reach = parseInt(document.getElementById('ad-reach').value || 0);
  const rate = type === 'reach' ? 10 : 15;
  const cost = reach * rate;

  document.getElementById('ad-cost-rate').textContent = `₦${rate} / person`;
  document.getElementById('ad-cost-total').textContent = naira(cost);
}

async function handleCreateAd(e) {
  e.preventDefault();
  const btn = document.getElementById('ad-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Paying & Submitting…';
  const fd = new FormData();
  fd.append('title', document.getElementById('ad-title').value);
  fd.append('message', document.getElementById('ad-message').value);
  fd.append('ad_type', document.getElementById('ad-type').value);
  fd.append('weekly_reach', document.getElementById('ad-reach').value);

  const imgInput = document.getElementById('ad-image');
  if (imgInput.files[0]) fd.append('image', imgInput.files[0]);

  try {
    const data = await API.addAd(fd);
    if (data.success) {
      showToast('Ad paid and submitted for admin review', 'success');
      await refreshDashboard();
      switchVendorView('ads');
    } else {
      showToast(data.error || 'Failed to submit ad', 'error');
      btn.disabled = false; btn.textContent = 'Pay upfront & submit ad';
    }
  } catch (err) {
    showToast(err.message || 'Connection error', 'error');
    btn.disabled = false; btn.textContent = 'Pay upfront & submit ad';
  }
}

async function handleAdToggle(aid) {
  try {
    const data = await API.toggleAd(aid);
    if (data.success) {
      showToast('Ad status updated', 'success');
      await refreshDashboard();
    } else {
      showToast(data.error || 'Failed to toggle ad', 'error');
    }
  } catch (err) { showToast('Action failed', 'error'); }
}

async function handleDeleteAd(aid, title) {
  const ok = await openModal({
    title: `Delete "${title}"?`,
    body: 'This action cannot be undone. Are you sure?',
    confirmText: 'Delete Ad',
    danger: true
  });
  if (!ok) return;
  try {
    const data = await API.deleteAd(aid);
    if (data.success) {
      showToast('Ad deleted', 'success');
      await refreshDashboard();
    } else {
      showToast(data.error || 'Failed to delete ad', 'error');
    }
  } catch (err) { showToast('Action failed', 'error'); }
}

/* -------- top up -------- */
function vendorTopupView() {
  return `
    <div class="view-head"><div><h1>Top up wallet</h1><div class="sub">Upload payment screenshot to fund your wallet for product impressions.</div></div></div>
    <div class="card" style="max-width:520px;">
      <div class="field" style="background:var(--surface-2); border:1.5px solid var(--line); border-radius:var(--radius); padding:16px; margin-bottom:18px;">
        <label style="margin-bottom:6px;">Send payment to</label>
        <div style="font-family:var(--font-mono); font-size:1.15em; font-weight:700; letter-spacing:.02em;">0915104726</div>
        <div style="margin-top:2px;">GT Bank &middot; Michael E.A.</div>
        <button type="button" class="btn btn-ghost" style="margin-top:10px;" onclick="copyText('0915104726', 'Account number copied')">📋 Copy account number</button>
        <div class="sub" style="margin-top:8px;">Transfer the amount above, then upload your payment screenshot below for approval.</div>
      </div>
      <form id="topup-form" onsubmit="return handleTopUp(event)">
        <div class="field"><label>Deposit Amount (₦)</label><input class="input" type="number" min="1" id="topup-amount" required placeholder="5000"></div>
        <div class="field">
          <label>Payment screenshot</label>
          <div class="dropzone" id="topup-dz">
            <input type="file" id="topup-proof" accept="image/*" required>
            <div class="dz-ic">🧾</div>
            <div class="dz-text">Drop payment proof screenshot here</div>
          </div>
        </div>
        <button type="submit" class="btn btn-money btn-full" id="topup-submit">Submit payment proof</button>
      </form>
    </div>
    <div class="card" style="max-width:520px; margin-top: 20px; border-color: var(--accent);">
      <h3 style="display: flex; gap: 10px; align-items: center;"><span>💬</span> Payment not verified or having issues?</h3>
      <p class="muted" style="margin: 8px 0 14px;">If your payment is not verified within 24 hours, or you’re having trouble, reach out to our support team on WhatsApp.</p>
      <button class="btn btn-whatsapp" onclick="contactWhatsAppSupport()">📱 Contact Support on WhatsApp</button>
    </div>`;
}

async function handleTopUp(e) {
  e.preventDefault();
  const btn = document.getElementById('topup-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Submitting…';
  
  try {
    const fileInput = document.getElementById('topup-proof');
    let proofFile = fileInput.files[0];
    
    // Compress proof image if needed
    if (proofFile && proofFile.size > 500 * 1024) {
      try {
        proofFile = await compressImage(proofFile, 1200, 1200, 0.7);
      } catch (compressErr) {
        console.warn('Image compression failed, using original:', compressErr);
      }
    }

    const fd = new FormData();
    fd.append('amount', document.getElementById('topup-amount').value);
    fd.append('proof', proofFile);

    const data = await API.topUp(fd);
    if (data.success) {
      showToast('Payment proof submitted for admin review', 'success');
      await refreshDashboard();
      switchVendorView('proofs');
    } else {
      showToast(data.error || 'Failed to submit proof', 'error');
      btn.disabled = false; btn.textContent = 'Submit payment proof';
    }
  } catch (err) {
    showToast(err.message || 'Failed to submit – please try again', 'error');
    btn.disabled = false; btn.textContent = 'Submit payment proof';
  }
}

/* -------- plan subscription -------- */
function vendorPlanView() {
  const u = state.user;
  const plans = state.plans || {};
  const currentPlan = u.active_plan;
  const hasActivePlan = u.active_plan && u.plan_expiry && new Date(u.plan_expiry) > new Date();

  return `
    <div class="view-head"><div><h1>Subscription Plans</h1><div class="sub">Choose a plan to list products and reach customers.</div></div></div>
    ${hasActivePlan ? `
      <div class="banner banner-success show" style="margin-bottom:20px;">
        ✅ Active Plan: <b>${currentPlan.toUpperCase()}</b> · Expires: ${new Date(u.plan_expiry).toLocaleDateString()}
      </div>
    ` : `
      <div class="banner banner-error show" style="margin-bottom:20px;">
        ⚠️ No active plan. Choose a plan below to start listing products.
      </div>
    `}
    <div class="grid grid-3">
      ${Object.entries(plans).map(([key, plan]) => `
        <div class="card" style="text-align:center; ${currentPlan === key && hasActivePlan ? 'border-color:var(--primary); box-shadow:0 0 0 2px var(--primary);' : ''}">
          <h3>${plan.name}</h3>
          <div style="font-size:2rem; font-weight:700; margin:12px 0;">${naira(plan.deposit)}</div>
          <div class="faint">Weekly commitment</div>
          <div style="margin:12px 0; text-align:left;">
            <div>✅ ${plan.keywords_limit} keywords</div>
            <div>✅ ${plan.weight}x visibility weight</div>
            <div>✅ ${plan.duration_days} days active</div>
          </div>
          ${currentPlan === key && hasActivePlan ? `
            <span class="badge badge-ok">Active Plan</span>
          ` : `
            <button class="btn btn-primary btn-full" onclick="handleActivatePlan('${key}')">Activate ${plan.name}</button>
          `}
        </div>
      `).join('')}
    </div>
    <div class="card" style="margin-top:20px;">
      <h3>How it works</h3>
      <ul style="margin-top:10px; padding-left:20px; color:var(--ink-soft);">
        <li>Choose a plan that fits your business needs</li>
        <li>Each plan requires a minimum wallet balance (deposit amount)</li>
        <li>You'll be charged ₦5 per product impression on WhatsApp</li>
        <li>Plans auto-renew weekly if you maintain minimum balance</li>
      </ul>
    </div>`;
}

async function handleActivatePlan(planKey) {
  const plan = state.plans[planKey];
  const ok = await openModal({
    title: `Activate ${plan.name} Plan?`,
    body: `This requires a minimum balance of <b>${naira(plan.deposit)}</b> in your wallet. Your current balance is <b>${naira(state.user.wallet_balance)}</b>. The plan will be active for ${plan.duration_days} days.`,
    confirmText: 'Activate Plan'
  });
  if (!ok) return;

  try {
    const data = await API.activatePlan(planKey);
    if (data.success) {
      showToast(`${plan.name} plan activated successfully!`, 'success');
      await refreshDashboard();
    } else {
      showToast(data.error || 'Failed to activate plan', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Action failed', 'error');
  }
}

/* -------- transactions -------- */
function vendorTransactionsView() {
  let list = [...(state.transactions || [])];
  if (state.ui.txFilter !== 'all') list = list.filter(t => state.ui.txFilter === 'credit' ? t.amount > 0 : t.amount < 0);

  return `
    <div class="view-head"><div><h1>Ledger Statement</h1><div class="sub">Review your wallet transactions and spendings.</div></div></div>
    <div class="toolbar">
      <select class="input" onchange="state.ui.txFilter=this.value; renderVendorView();">
        <option value="all">All transactions</option>
        <option value="credit" ${state.ui.txFilter === 'credit' ? 'selected' : ''}>Credits only</option>
        <option value="debit" ${state.ui.txFilter === 'debit' ? 'selected' : ''}>Debits only</option>
      </select>
    </div>
    ${list.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            ${list.map(t => `
              <tr>
                <td>${(t.created_at || '').slice(0, 10)}</td>
                <td>${escapeHtml(t.description)}</td>
                <td class="${t.amount < 0 ? 'amount-neg' : 'amount-pos'}">${t.amount < 0 ? '-' : '+'}${naira(Math.abs(t.amount))}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    ` : emptyState('📜', 'No transactions logged', 'Ledger entries will show here once billing actions begin.')}`;
}

/* -------- payment proofs -------- */
function vendorProofsView() {
  const list = state.proofs || [];
  const badgeClass = s => s === 'approved' ? 'badge-ok' : s === 'pending' ? 'badge-wait' : 'badge-off';

  return `
    <div class="view-head"><div><h1>Payment proof submissions</h1><div class="sub">Verify the processing status of your deposits.</div></div></div>
    ${list.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Screenshot</th></tr></thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td>${(p.created_at || '').slice(0, 10)}</td>
                <td class="num">${naira(p.amount)}</td>
                <td><span class="badge ${badgeClass(p.status)}">${p.status.toUpperCase()}</span></td>
                <td><button class="btn btn-ghost btn-xs" onclick="openLightbox('${API_BASE}/static/uploads/proofs/${p.proof_image}')">View</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    ` : emptyState('🧾', 'No deposits submitted', 'Upload payment screenshots in the Top Up tab to fund your wallet.')}
    <div class="card" style="max-width:520px; margin-top: 20px; border-color: var(--accent);">
      <h3 style="display: flex; gap: 10px; align-items: center;"><span>💬</span> Payment not verified or having issues?</h3>
      <p class="muted" style="margin: 8px 0 14px;">If your payment is not verified within 24 hours, or you’re having trouble, reach out to our support team on WhatsApp.</p>
      <button class="btn btn-whatsapp" onclick="contactWhatsAppSupport()">📱 Contact Support on WhatsApp</button>
    </div>`;
}

/* -------- profile -------- */
function vendorProfileView() {
  const u = state.user;

  return `
    <div class="view-head"><div><h1>Store Profile</h1><div class="sub">Update your store information.</div></div></div>
    <div class="card" style="max-width:520px;">
      <form id="profile-form" onsubmit="return handleUpdateProfile(event)">
        <div class="field">
          <label>Store/Business Name</label>
          <input class="input" id="profile-business-name" value="${escapeHtml(u.business_name)}" required>
        </div>
        <div class="field">
          <label>WhatsApp Number</label>
          <input class="input" id="profile-phone" value="${escapeHtml(u.phone)}" required>
          <div class="hint">Include country code. E.g. 23480...</div>
        </div>
        <div class="field">
          <label>Email Address</label>
          <input class="input" id="profile-email" value="${escapeHtml(u.email)}" disabled>
          <div class="hint">Email cannot be changed</div>
        </div>
        <div class="field">
          <label>Unique Vendor ID</label>
          <input class="input" value="${escapeHtml(u.unique_id)}" disabled>
          <div class="hint">Permanent identifier</div>
        </div>
        <button type="submit" class="btn btn-primary btn-full" id="profile-submit">Update Profile</button>
      </form>
    </div>`;
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const btn = document.getElementById('profile-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Updating…';

  const data = {
    business_name: document.getElementById('profile-business-name').value,
    phone: document.getElementById('profile-phone').value
  };

  try {
    const res = await API.updateProfile(data);
    if (res.success) {
      state.user = res.user;
      showToast('Profile updated successfully!', 'success');
      await refreshDashboard();
    } else {
      showToast(res.error || 'Failed to update profile', 'error');
      btn.disabled = false; btn.textContent = 'Update Profile';
    }
  } catch (err) {
    showToast(err.message || 'Connection error', 'error');
    btn.disabled = false; btn.textContent = 'Update Profile';
  }
}

/* -------- dropzone helpers -------- */
function setupDropzone(inputId, dzId) {
  const dz = document.getElementById(dzId);
  const input = document.getElementById(inputId);
  if (!dz || !input) return;
  ['dragenter', 'dragover'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => {
    if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; previewDropzone(inputId, dzId); }
  });
  input.addEventListener('change', () => previewDropzone(inputId, dzId));
}

function previewDropzone(inputId, dzId) {
  const input = document.getElementById(inputId);
  const dz = document.getElementById(dzId);
  const file = input.files[0];
  if (!file) return;
  dz.classList.add('has-file');
  const reader = new FileReader();
  reader.onload = () => {
    let preview = dz.querySelector('.dz-preview');
    if (!preview) { preview = document.createElement('div'); preview.className = 'dz-preview'; dz.appendChild(preview); }
    preview.classList.add('show');
    preview.innerHTML = `<img src="${reader.result}"><div><div style="font-weight:600;font-size:.85em;">${escapeHtml(file.name)}</div><div class="faint">${(file.size / 1024).toFixed(0)} KB — ready</div></div>`;
  };
  reader.readAsDataURL(file);
}

/* ================================================================
   DASHBOARD REFRESH
   ================================================================ */
async function refreshDashboard() {
  try {
    const data = await API.getDashboard();
    if (data.success) {
      Object.assign(state, {
        user: data.user,
        products: data.products || [],
        transactions: data.transactions || [],
        proofs: data.proofs || [],
        ads: data.ads || [],
        plans: data.plans || {},
        adFrequencies: data.ad_frequencies || {},
        perImpression: data.per_impression || 5
      });
      Pages.dashboard();
    }
  } catch (err) {
    console.error('Dashboard refresh failed:', err);
    showToast('Could not refresh dashboard', 'error');
  }
}

/* ================================================================
   ROUTER MAPPINGS & INITIALIZATION
   ================================================================ */
Router.add('/login', Pages.login);
Router.add('/signup', Pages.signup);
Router.add('/dashboard', Pages.dashboard);

initTheme();
restoreSession();
Router.init();

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await API.getDashboard();
    if (data.success && data.user) {
      if (data.user.role === 'brand') {
        window.location.href = '/brand';
        return;
      }
      Object.assign(state, {
        user: data.user,
        products: data.products || [],
        transactions: data.transactions || [],
        proofs: data.proofs || [],
        ads: data.ads || [],
        plans: data.plans || {},
        adFrequencies: data.ad_frequencies || {},
        perImpression: data.per_impression || 5
      });
      saveSession();
      Router.navigate('/dashboard');
      return;
    }
  } catch (e) {}
  if (!state.user) Router.navigate('/login');
});