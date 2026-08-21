/* ================================================================
   STATE
   ================================================================ */
const API_BASE = window.API_BASE || 'https://myguy.pythonanywhere.com';

const state = {
  user: null,
  transactions: [],
  proofs: [],
  ads: [],
  services: [],
  adFrequencies: {},
  ui: {
    activeView: 'overview',
    txFilter: 'all',
  }
};

const SESSION_KEY = 'myguy-brand-session';

function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    user: state.user,
    transactions: state.transactions,
    proofs: state.proofs,
    ads: state.ads,
    services: state.services,
    adFrequencies: state.adFrequencies
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

async function copyText(text, label = 'Copied to clipboard') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(label, 'success');
  } catch (e) {
    showToast('Could not copy — copy it manually', 'error');
  }
}

/* ================================================================
   API CLIENT (FIXED: credentials: 'include')
   ================================================================ */
const API = {
  async request(url, options = {}) {
    const fullUrl = API_BASE + url;
    const cfg = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ← required for cross‑origin sessions
      ...options
    };
    if (options.body instanceof FormData) delete cfg.headers['Content-Type'];
    const res = await fetch(fullUrl, cfg);
    return res.json();
  },
  login: (email, password) => API.request('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (data) => API.request('/api/signup', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => API.request('/api/logout', { method: 'POST' }),
  getDashboard: () => API.request('/api/dashboard'),
  topUp: (fd) => API.request('/api/wallet/topup', { method: 'POST', body: fd }),
  addAd: (fd) => API.request('/api/ads/create', { method: 'POST', body: fd }),
  toggleAd: (id) => API.request(`/api/ads/toggle/${id}`, { method: 'POST' }),
  verifyBrand: () => API.request('/api/brand/verify', { method: 'POST' }),
  addService: (fd) => API.request('/api/services/add', { method: 'POST', body: fd }),
  deleteService: (id) => API.request(`/api/services/delete/${id}`, { method: 'POST' }),
  toggleService: (id) => API.request(`/api/services/toggle/${id}`, { method: 'POST' })
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
      eyebrow: 'Brand Advertiser Portal',
      headline: 'Broadcast ads<br>directly to WhatsApp.',
      pitch: 'Promote events, release music, or push social links. Reach thousands of WhatsApp contacts on Lagos and regional networks.',
      ticker: `<span>No catalog required</span><span>Flat ad rates</span><span>Weekly commitments</span>`,
      formHtml: `
        <h2>Brand Advertisers</h2>
        <p class="subtitle">Sign in to your ad broadcast manager</p>
        <div class="banner banner-error" id="login-banner"></div>
        <form id="login-form" onsubmit="return handleLogin(event)">
          <div class="field">
            <label>Email address</label>
            <input class="input" type="email" id="login-email" required placeholder="brand@example.com">
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
          <div>New Advertiser? <a href="#" style="color:var(--primary); font-weight:600;" onclick="Router.navigate('/signup')">Register brand</a></div>
          <div>Are you a Vendor/Store? <a href="/" style="color:var(--primary); font-weight:600;">Go to Vendor Portal →</a></div>
          <div class="divider" style="margin: 8px 0;"></div>
          <div>Forgot password? <a href="#" style="color:var(--accent); font-weight:600;" onclick="contactWhatsAppSupport()">Contact support on WhatsApp</a></div>
        </div>`
    });
  },

  signup() {
    document.getElementById('app').innerHTML = authShell({
      eyebrow: 'Advertiser Account',
      headline: 'Register your Brand<br>to start broadcasting.',
      pitch: 'One-time ₦1,000 verification fee. Post ads for event tickets, promotions, or social pages.',
      ticker: `<span>Verification fee: ₦1,000</span><span>Reach rates from ₦20/person</span><span>Manual admin review</span>`,
      formHtml: `
        <h2>Brand Registration</h2>
        <p class="subtitle">Fill the fields below to register</p>
        <div class="banner banner-error" id="signup-banner"></div>
        <form id="signup-form" onsubmit="return handleSignup(event)">
          <div class="field">
            <label>Brand Name</label>
            <input class="input" type="text" id="signup-brand-name" required placeholder="e.g. Lagos Event Planners">
          </div>
          <div class="field">
            <label>Contact Person</label>
            <input class="input" type="text" id="signup-contact" required placeholder="John Doe">
          </div>
          <div class="field">
            <label>WhatsApp Number</label>
            <input class="input" type="text" id="signup-phone" required placeholder="2348012345678">
            <div class="hint">Includes country code. E.g. 23480...</div>
          </div>
          <div class="field">
            <label>Email address</label>
            <input class="input" type="email" id="signup-email" required placeholder="brand@example.com">
          </div>
          <div class="field">
            <label>Password</label>
            <div class="input-wrap">
              <input class="input" type="password" id="signup-password" required placeholder="Min 6 characters" minlength="6">
              <button type="button" class="input-toggle" onclick="togglePw('signup-password',this)">Show</button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="signup-submit">Register brand</button>
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
  const message = 'Hello, I need help with my My Guy brand account.';
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
      if (data.user.role !== 'brand') {
        showToast('Vendor account. Redirecting to Vendor Portal...', 'info');
        setTimeout(() => { window.location.href = '/'; }, 1000);
        return;
      }
      Object.assign(state, {
        user: data.user,
        transactions: data.transactions || [],
        proofs: data.proofs || [],
        ads: data.ads || [],
        services: data.services || [],
        adFrequencies: data.ad_frequencies || {}
      });
      saveSession();
      showToast(`Welcome back, ${data.user.business_name}!`, 'success');
      Router.navigate('/dashboard');
    } else {
      showBanner('login-banner', data.error || 'Login failed');
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  } catch (err) {
    showBanner('login-banner', 'Connection error. Please try again.');
    btn.disabled = false; btn.textContent = 'Sign in';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Creating…';
  const data = {
    role: 'brand',
    brand_name: document.getElementById('signup-brand-name').value,
    contact_person: document.getElementById('signup-contact').value,
    email: document.getElementById('signup-email').value,
    phone: document.getElementById('signup-phone').value,
    password: document.getElementById('signup-password').value,
  };
  try {
    const res = await API.signup(data);
    if (res.success) {
      showToast('Brand registered! Log in to continue.', 'success');
      Router.navigate('/login');
    } else {
      showBanner('signup-banner', res.error || 'Signup failed');
      btn.disabled = false; btn.textContent = 'Register brand';
    }
  } catch (err) {
    showBanner('signup-banner', 'Connection error. Please try again.');
    btn.disabled = false; btn.textContent = 'Register brand';
  }
}

async function handleLogout() {
  try { await API.logout(); } catch (e) {}
  state.user = null;
  localStorage.removeItem(SESSION_KEY);
  state.transactions = [];
  state.proofs = [];
  showToast('Signed out successfully', 'info');
  Router.navigate('/login');
}

/* ================================================================
   BRAND DASHBOARD SHELL
   ================================================================ */
function shellHtml({ navItems, activeKey, topbarRight, contentHtml }) {
  const navHtml = navItems.map(n => `
    <button class="nav-item ${n.key === activeKey ? 'active' : ''}" onclick="${n.onClick}">
      <span class="ic">${n.icon}</span><span>${n.label}</span>
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
        <div style="font-weight: 700; color: var(--accent); font-size: 1.1em;">Advertiser Dashboard</div>
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
  const navItems = [
    { key: 'overview', icon: '📊', label: 'Overview', onClick: "switchBrandView('overview')" },
    { key: 'ads', icon: '📢', label: 'Broadcast Ads', onClick: "switchBrandView('ads')" },
    { key: 'services', icon: '🛠️', label: 'My Services', onClick: "switchBrandView('services')" },
    { key: 'topup', icon: '⬆️', label: 'Top Up', onClick: "switchBrandView('topup')" },
    { key: 'transactions', icon: '📜', label: 'Ledger Statement', onClick: "switchBrandView('transactions')" },
    { key: 'proofs', icon: '🧾', label: 'Payment Proofs', onClick: "switchBrandView('proofs')" },
  ];
  const html = shellHtml({
    activeKey: view, navItems,
    topbarRight: {
      right: `
        <div class="wallet-pill">💰 ${naira(state.user.wallet_balance)}</div>
        <div class="avatar" style="background:var(--accent); color:var(--accent-ink);" title="${escapeHtml(state.user.business_name)}">BR</div>
        <button class="btn btn-ghost btn-sm" onclick="handleLogout()">Log out</button>`
    },
    contentHtml: `<div id="brand-view-root"></div>`
  });
  document.getElementById('app').innerHTML = html;
  renderThemeToggleLabel();
  renderBrandView();
};

function switchBrandView(key) {
  state.ui.activeView = key;
  renderBrandView();
}

function renderBrandView() {
  const root = document.getElementById('brand-view-root');
  const view = state.ui.activeView;
  const renderers = {
    overview: brandOverviewView,
    ads: brandAdsView,
    services: brandServicesView,
    topup: brandTopupView,
    transactions: brandTransactionsView,
    proofs: brandProofsView,
  };
  root.innerHTML = renderers[view] ? renderers[view]() : '';

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const idx = ['overview', 'ads', 'services', 'topup', 'transactions', 'proofs'].indexOf(view);
  const navEls = document.querySelectorAll('.sidebar .nav-item');
  if (navEls[idx]) navEls[idx].classList.add('active');

  if (view === 'topup') setupDropzone('topup-proof', 'topup-dz');
  if (view === 'ads' && state.user.verified) setupDropzone('ad-image', 'ad-dz');
  if (view === 'services' && state.user.verified && (state.services || []).length < 3) setupDropzone('service-image', 'service-dz');
}

/* ================================================================
   BRAND VIEW MARKUPS
   ================================================================ */
function brandOverviewView() {
  const u = state.user;
  const ads = state.ads || [];
  const activeAds = ads.filter(a => a.status === 'approved' && a.automation_active).length;
  const txs = (state.transactions || []).slice(0, 10);

  return `
    <div class="view-head">
      <div>
        <h1>Welcome, ${escapeHtml(u.business_name)} 👋</h1>
        <div class="sub">Brand ID: <span class="num" style="font-weight: 700; color: var(--accent);">${escapeHtml(u.unique_id)}</span></div>
      </div>
    </div>

    <div class="grid grid-3">
      <div class="stat-card"><span class="ic">💰</span><div class="label">Ad Wallet Balance</div><div class="value">${naira(u.wallet_balance)}</div><div class="delta">Pre-paid ad reach</div></div>
      <div class="stat-card"><span class="ic">📢</span><div class="label">Broadcast Ads</div><div class="value">${ads.length}</div><div class="delta">${activeAds} currently active</div></div>
      <div class="stat-card">
        <span class="ic">🛡️</span>
        <div class="label">Verification status</div>
        <div class="value" style="font-size: 1.25em; margin-top: 12px;">
          ${u.verified ? '<span class="badge badge-ok">VERIFIED BRAND</span>' :
            (u.verification_pending ? '<span class="badge badge-wait">AWAITING APPROVAL</span>' : '<span class="badge badge-off">UNVERIFIED</span>')}
        </div>
      </div>
    </div>

    ${!u.verified ? `
      <div class="verification-card" style="margin-top: 20px;">
        <span style="font-size: 2.2em;">🛡️</span>
        <h3>Verification Required</h3>
        <p class="muted" style="margin: 8px auto 16px; max-width: 440px;">Brands require a manual account verification before they can post ad campaigns. This requires a one-time verification fee of <b>₦1,000</b>. Make sure you have funded your wallet.</p>
        ${u.verification_pending ? `
          <div class="verification-status badge badge-wait">Verification request pending approval</div>
        ` : `
          <button class="btn btn-primary" onclick="submitBrandVerification()">Pay ₦1,000 & Request Verification</button>
        `}
      </div>
    ` : ''}

    <div class="card" style="margin-top: 20px;">
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
      ` : emptyState('📭', 'No ledger activity', 'Top up your wallet to activate verification or fund ad reach.')}
    </div>
  `;
}

async function submitBrandVerification() {
  const ok = await openModal({
    title: 'Pay Verification Fee?',
    body: 'This will debit <b>₦1,000</b> from your wallet balance to enter the admin approval queue. Verification fees are non-refundable. Proceed?',
    confirmText: 'Pay ₦1,000'
  });
  if (!ok) return;

  try {
    const res = await API.verifyBrand();
    if (res.success) {
      showToast('Verification request submitted successfully!', 'success');
      await refreshDashboard();
    } else {
      showToast(res.error || 'Request failed', 'error');
    }
  } catch (err) { showToast('Request failed', 'error'); }
}

function brandAdsView() {
  const u = state.user;
  const ads = state.ads || [];

  if (!u.verified) {
    return `
      <div class="view-head"><div><h1>Broadcast Ads</h1><div class="sub">Submit event ticket promotions, pushes or social broadcasts.</div></div></div>
      <div class="card" style="border-color: var(--accent); padding: 30px; text-align: center;">
        <span style="font-size: 3em;">🛡️</span>
        <h3 style="justify-content: center; margin-top: 15px;">Verification Required</h3>
        <p class="muted" style="margin: 10px auto 20px; max-width: 440px;">Your brand account must be verified by the admin before you can access the ad creation engine. Please verify in the **Overview** dashboard.</p>
      </div>`;
  }

  return `
    <div class="view-head"><div><h1>Broadcast Ads</h1><div class="sub">Reach Nigerian WhatsApp shoppers directly. Paid upfront, weekly commitment.</div></div></div>
    <div class="grid grid-2">
      <div class="card">
        <h3>Create and pay for Ad</h3>
        <form id="add-ad-form" onsubmit="return handleCreateAd(event)">
          <div class="field"><label>Ad Title</label><input class="input" id="ad-title" required placeholder="Lagos Pool Party Promo" maxlength="80"></div>
          <div class="field"><label>Broadcast Message</label><textarea class="input" id="ad-message" rows="4" required placeholder="Tell WhatsApp customers about your event, music, or push." maxlength="400"></textarea></div>
          <div class="field">
            <label>Ad Type</label>
            <select class="input" id="ad-type" onchange="calculateAdCost()">
              <option value="reach">Reach ad (Plain broadcast) - ₦20/person</option>
              <option value="spotlight">Spotlight ad (Broadcast + AI-crafted mention) - ₦25/person</option>
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
              <span>Rate:</span><span id="ad-cost-rate">₦20 / person</span>
            </div>
            <div class="flex-between" style="font-weight: 700; margin-top: 5px;">
              <span>Total Cost (debit):</span><span id="ad-cost-total">₦2,000.00</span>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="ad-submit">Pay upfront & submit ad</button>
        </form>
      </div>

      <div class="card">
        <h3>Your Broadcast Campaigns</h3>
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
        ${a.status === 'approved' ? `
          <button class="btn btn-ghost btn-xs" onclick="handleAdToggle('${a.id}')">${a.automation_active ? 'Stop' : 'Start'}</button>
        ` : ''}
      </div>
    </div>`;
}

function calculateAdCost() {
  const type = document.getElementById('ad-type').value;
  const reach = parseInt(document.getElementById('ad-reach').value || 0);
  const rate = type === 'reach' ? 20 : 25;
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
      switchBrandView('ads');
    } else {
      showToast(data.error || 'Failed to submit ad', 'error');
      btn.disabled = false; btn.textContent = 'Pay upfront & submit ad';
    }
  } catch (err) {
    showToast('Connection error', 'error');
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

/* -------- services -------- */
function brandServicesView() {
  const u = state.user;
  const services = state.services || [];
  const atLimit = services.length >= 3;

  if (!u.verified) {
    return `
      <div class="view-head"><div><h1>My Services</h1><div class="sub">List up to 3 services customers can book directly — e.g. electrician, tailor, plumber.</div></div></div>
      <div class="card" style="border-color: var(--accent); padding: 30px; text-align: center;">
        <span style="font-size: 3em;">🛡️</span>
        <h3 style="justify-content: center; margin-top: 15px;">Verification Required</h3>
        <p class="muted" style="margin: 10px auto 20px; max-width: 440px;">Your brand account must be verified by the admin before you can list services. Please verify in the **Overview** dashboard.</p>
      </div>`;
  }

  return `
    <div class="view-head"><div><h1>My Services</h1><div class="sub">${services.length}/3 services listed. Customers see these on your brand profile.</div></div></div>
    <div class="grid grid-2">
      <div class="card">
        <h3>${atLimit ? 'Service limit reached' : 'Add a service'}</h3>
        ${atLimit ? `
          <p class="muted" style="margin-top:10px;">You've listed the maximum of 3 services. Delete one to add a different one.</p>
        ` : `
          <form id="add-service-form" onsubmit="return handleAddService(event)">
            <div class="field"><label>Service Title</label><input class="input" id="service-title" required placeholder="e.g. Electrician — Wiring &amp; Repairs" maxlength="80"></div>
            <div class="field"><label>Location</label><input class="input" id="service-location" required placeholder="e.g. Ikeja, Lagos" maxlength="80"></div>
            <div class="field"><label>Pay per hour (₦)</label><input class="input" type="number" id="service-rate" min="0" required placeholder="3000"></div>
            <div class="field"><label>Description <span class="faint">(optional)</span></label><textarea class="input" id="service-description" rows="3" placeholder="What you offer, experience, tools provided, etc." maxlength="400"></textarea></div>
            <div class="field">
              <label>Photo <span class="faint">(optional)</span></label>
              <div class="dropzone" id="service-dz">
                <input type="file" id="service-image" accept="image/*">
                <div class="dz-ic">🖼️</div>
                <div class="dz-text">Browse a photo of your work</div>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-full" id="service-submit">List Service</button>
          </form>
        `}
      </div>

      <div class="card">
        <h3>Your Listed Services</h3>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
          ${services.length ? services.map(serviceCardHtml).join('') : emptyState('🛠️', 'No services listed', 'Add a service on the left to get started.')}
        </div>
      </div>
    </div>
  `;
}

function serviceCardHtml(s) {
  const statusLabel = s.active ? '🟢 Visible' : '⏸️ Hidden';
  return `
    <div class="card" style="padding: 14px; display:flex; gap:12px; align-items:flex-start;">
      ${s.image ? `<img src="${API_BASE}/static/uploads/services/${s.image}" alt="${escapeHtml(s.title)}" style="width:64px; height:64px; object-fit:cover; border-radius:var(--radius-sm); flex-shrink:0;">` : ''}
      <div style="flex:1; min-width:0;">
        <div class="flex-between">
          <h4 style="font-size: 1.02em; margin:0;">${escapeHtml(s.title)}</h4>
          <span class="faint">${statusLabel}</span>
        </div>
        <div class="faint" style="margin: 4px 0;">📍 ${escapeHtml(s.location)} · ${naira(s.rate_per_hour)}/hr</div>
        ${s.description ? `<p class="muted" style="font-size: .85em; margin: 6px 0; line-height: 1.4;">${escapeHtml(s.description)}</p>` : ''}
        <div style="display:flex; gap:6px; margin-top:8px;">
          <button class="btn btn-ghost btn-xs" onclick="handleServiceToggle('${s.id}')">${s.active ? 'Hide' : 'Show'}</button>
          <button class="btn btn-danger btn-xs" onclick="handleDeleteService('${s.id}','${escapeHtml(s.title)}')">Delete</button>
        </div>
      </div>
    </div>`;
}

async function handleAddService(e) {
  e.preventDefault();
  const btn = document.getElementById('service-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Listing…';

  const fd = new FormData();
  fd.append('title', document.getElementById('service-title').value);
  fd.append('location', document.getElementById('service-location').value);
  fd.append('rate_per_hour', document.getElementById('service-rate').value);
  fd.append('description', document.getElementById('service-description').value);
  const imgInput = document.getElementById('service-image');
  if (imgInput.files[0]) fd.append('image', imgInput.files[0]);

  try {
    const data = await API.addService(fd);
    if (data.success) {
      showToast('Service listed successfully!', 'success');
      await refreshDashboard();
      switchBrandView('services');
    } else {
      showToast(data.error || 'Failed to list service', 'error');
      btn.disabled = false; btn.textContent = 'List Service';
    }
  } catch (err) {
    showToast('Connection error', 'error');
    btn.disabled = false; btn.textContent = 'List Service';
  }
}

async function handleServiceToggle(sid) {
  try {
    const data = await API.toggleService(sid);
    if (data.success) {
      showToast('Service visibility updated', 'success');
      await refreshDashboard();
    } else {
      showToast(data.error || 'Failed to update service', 'error');
    }
  } catch (err) { showToast('Action failed', 'error'); }
}

async function handleDeleteService(sid, title) {
  const ok = await openModal({
    title: `Delete "${title}"?`,
    body: 'This action cannot be undone. Are you sure?',
    confirmText: 'Delete Service',
    danger: true
  });
  if (!ok) return;
  try {
    const data = await API.deleteService(sid);
    if (data.success) {
      showToast('Service deleted', 'success');
      await refreshDashboard();
    } else {
      showToast(data.error || 'Failed to delete service', 'error');
    }
  } catch (err) { showToast('Action failed', 'error'); }
}

/* -------- top up -------- */
function brandTopupView() {
  return `
    <div class="view-head"><div><h1>Top up wallet</h1><div class="sub">Upload payment screenshot to fund your ad budget.</div></div></div>
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
  const fd = new FormData();
  fd.append('amount', document.getElementById('topup-amount').value);
  fd.append('proof', document.getElementById('topup-proof').files[0]);
  try {
    const data = await API.topUp(fd);
    if (data.success) {
      showToast('Payment proof submitted for admin review', 'success');
      await refreshDashboard();
      switchBrandView('proofs');
    } else {
      showToast(data.error || 'Failed to submit proof', 'error');
      btn.disabled = false; btn.textContent = 'Submit payment proof';
    }
  } catch (err) {
    showToast('Connection error', 'error');
    btn.disabled = false; btn.textContent = 'Submit payment proof';
  }
}

/* -------- transactions / ledger statement -------- */
function brandTransactionsView() {
  let list = [...(state.transactions || [])];
  if (state.ui.txFilter !== 'all') list = list.filter(t => state.ui.txFilter === 'credit' ? t.amount > 0 : t.amount < 0);
  return `
    <div class="view-head"><div><h1>Ledger Statement</h1><div class="sub">Review your ad budget spendings and topups.</div></div></div>
    <div class="toolbar">
      <select class="input" onchange="state.ui.txFilter=this.value; renderBrandView();">
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

/* -------- payment proofs status -------- */
function brandProofsView() {
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
    ` : emptyState('🧾', 'No deposits submitted', 'Upload payment screenshots in the Top Up tab to fund your ad budget.')}
    <div class="card" style="max-width:520px; margin-top: 20px; border-color: var(--accent);">
      <h3 style="display: flex; gap: 10px; align-items: center;"><span>💬</span> Payment not verified or having issues?</h3>
      <p class="muted" style="margin: 8px 0 14px;">If your payment is not verified within 24 hours, or you’re having trouble, reach out to our support team on WhatsApp.</p>
      <button class="btn btn-whatsapp" onclick="contactWhatsAppSupport()">📱 Contact Support on WhatsApp</button>
    </div>`;
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
        transactions: data.transactions || [],
        proofs: data.proofs || [],
        ads: data.ads || [],
        services: data.services || [],
        adFrequencies: data.ad_frequencies || {}
      });
      Pages.dashboard();
    }
  } catch (err) { console.error('Dashboard refresh failed:', err); }
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
      if (data.user.role !== 'brand') {
        window.location.href = '/';
        return;
      }
      Object.assign(state, {
        user: data.user,
        transactions: data.transactions || [],
        proofs: data.proofs || [],
        ads: data.ads || [],
        services: data.services || [],
        adFrequencies: data.ad_frequencies || {}
      });
      saveSession();
      Router.navigate('/dashboard');
      return;
    }
  } catch (e) {}
  if (!state.user) Router.navigate('/login');
});