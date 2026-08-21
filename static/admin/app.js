/* ================================================================
   STATE
   ================================================================ */
const API_BASE = window.API_BASE || 'https://myguy.pythonanywhere.com';

const state = {
  isAdmin: false,
  allUsers: [],
  allProducts: [],
  allProofs: [],
  allAds: [],
  conversations: [],
  conversationDetail: [],
  stats: {},
  settings: {},
  adFrequencies: {},
  ui: {
    adminView: 'overview',
    vendorSearch: '',
    vendorFilter: 'all',
    productSearch: '',
    proofFilter: 'pending',
    adFilter: 'pending',
    conversationSearch: '',
    activeConversationPhone: null,
    reviewingAdId: null,
    brandFilter: 'pending'
  }
};

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
   TOASTS & LIGHTBOX
   ================================================================ */
function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '⚠️', info: '💬' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="ic">${icons[type] || ''}</span><span>${escapeHtml(message)}</span>`;
  document.getElementById('toast-stack').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 200); }, 3800);
}

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

function timeAgo(iso) {
  if (!iso) return '-';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function emptyState(icon, title, body) {
  return `<div class="empty"><div class="ic">${icon}</div><h4>${title}</h4><p>${body}</p></div>`;
}

async function copyText(text, label = 'Copied to clipboard') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(label, 'success');
  } catch (e) {
    showToast('Could not copy', 'error');
  }
}

/* ================================================================
   API CLIENT (FIXED: added credentials: 'include')
   ================================================================ */
const API = {
  async request(url, options = {}) {
    const fullUrl = API_BASE + url;
    const cfg = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ← SEND SESSION COOKIE CROSS‑ORIGIN
      ...options
    };
    if (options.body instanceof FormData) delete cfg.headers['Content-Type'];
    const res = await fetch(fullUrl, cfg);
    return res.json();
  },
  adminLogin: (u, p) => API.request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
  adminLogout: () => API.request('/api/admin/logout', { method: 'POST' }),
  adminStatus: () => API.request('/api/admin/status', { method: 'GET' }),
  adminDashboard: () => API.request('/api/admin/dashboard'),
  adminToggleVendor: (id) => API.request(`/api/admin/vendor/${id}/toggle`, { method: 'POST' }),
  adminReviewPayment: (id, action) => API.request(`/api/admin/payments/${id}/${action}`, { method: 'POST' }),
  adminGetConversation: (phone) => API.request(`/api/admin/conversations/${phone}`),
  adminBroadcast: (message) => API.request('/api/admin/broadcast', { method: 'POST', body: JSON.stringify({ message }) }),
  adminSaveSettings: (settings) => API.request('/api/admin/settings', { method: 'POST', body: JSON.stringify(settings) }),
  adminApproveAd: (id, schedule) => API.request(`/api/admin/ads/${id}/approve`, { method: 'POST', body: JSON.stringify(schedule) }),
  adminRejectAd: (id, reason) => API.request(`/api/admin/ads/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  adminSetAdSchedule: (id, schedule) => API.request(`/api/admin/ads/${id}/schedule`, { method: 'POST', body: JSON.stringify(schedule) }),
  adminToggleAdAutomation: (id) => API.request(`/api/admin/ads/${id}/toggle`, { method: 'POST' }),
  adminSendAdNow: (id) => API.request(`/api/admin/ads/${id}/send-now`, { method: 'POST' }),
  adminReviewBrand: (uid, action) => API.request(`/api/admin/brands/${uid}/verify/${action}`, { method: 'POST' }),
  adminReply: (phone, message) => API.request('/api/admin/reply', { method: 'POST', body: JSON.stringify({ phone, message }) }),
  adminTogglePause: (phone) => API.request(`/api/admin/conversations/${phone}/toggle-pause`, { method: 'POST' }),
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
   AUTH PANEL
   ================================================================ */
function authShell({ eyebrow, headline, pitch, formHtml }) {
  return `
  <div class="auth-shell">
    <div class="auth-brand">
      <div class="mark">
        <img src="/static/sitpic/logo.png" alt="My Guy" class="brand-logo" onerror="this.style.display='none'">
        <span class="logo-text">My Guy</span>
      </div>
      <div class="pitch">
        <span class="eyebrow">${eyebrow}</span>
        <h1>${headline}</h1>
        <p>${pitch}</p>
      </div>
      <div class="ticker">
        <span>Admin Backdoor Restricted Access</span>
      </div>
    </div>
    <div class="auth-form-side">
      <div class="auth-card">${formHtml}</div>
    </div>
  </div>`;
}

const Pages = {
  login() {
    document.getElementById('app').innerHTML = authShell({
      eyebrow: 'Restricted backend portal',
      headline: 'Configure & monitor<br>the Nigerian marketplace.',
      pitch: 'Approve deposits, review ad schedule queues, watch incoming WhatsApp transcripts, and tune AI prompt defaults.',
      formHtml: `
        <h2>Staff Access Only</h2>
        <p class="subtitle">Authorized credentials required</p>
        <div class="banner banner-error" id="admin-login-banner"></div>
        <form id="admin-login-form" onsubmit="return handleAdminLogin(event)">
          <div class="field">
            <label>Username</label>
            <input class="input" type="text" id="admin-username" required placeholder="admin">
          </div>
          <div class="field">
            <label>Password</label>
            <div class="input-wrap">
              <input class="input" type="password" id="admin-password" required placeholder="••••••••">
              <button type="button" class="input-toggle" onclick="togglePw('admin-password',this)">Show</button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="admin-login-submit">Sign in to Backdoor</button>
        </form>`
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

async function handleAdminLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('admin-login-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Authenticating…';
  const u = document.getElementById('admin-username').value;
  const p = document.getElementById('admin-password').value;
  try {
    const data = await API.adminLogin(u, p);
    if (data.success) {
      // Store admin state locally so a browser refresh keeps the dashboard available.
      localStorage.setItem('adminSession', JSON.stringify({
        isAdmin: true,
        stats: data.stats || {},
        allUsers: data.users || [],
        allProducts: data.products || [],
        allProofs: data.proofs || [],
        allAds: data.ads || [],
        adFrequencies: data.ad_frequencies || {},
        conversations: data.conversations || [],
        settings: data.settings || {}
      }));

      Object.assign(state, {
        isAdmin: true,
        stats: data.stats || {},
        allUsers: data.users || [],
        allProducts: data.products || [],
        allProofs: data.proofs || [],
        allAds: data.ads || [],
        adFrequencies: data.ad_frequencies || {},
        conversations: data.conversations || [],
        settings: data.settings || {}
      });
      showToast('Admin session activated', 'success');
      Router.navigate('/dashboard');
    } else {
      showBanner('admin-login-banner', data.error || 'Access denied');
      btn.disabled = false; btn.textContent = 'Sign in to Backdoor';
    }
  } catch (err) {
    showBanner('admin-login-banner', 'Network connection failed');
    btn.disabled = false; btn.textContent = 'Sign in to Backdoor';
  }
}

async function handleAdminLogout() {
  try { await API.adminLogout(); } catch (e) {}
  localStorage.removeItem('adminSession');
  state.isAdmin = false;
  showToast('Admin session logged out', 'info');
  Router.navigate('/login');
}

/* ================================================================
   ADMIN SHELL LAYOUT
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
        <img src="/static/sitpic/logo.png" alt="My Guy" class="brand-logo brand-logo-small" onerror="this.style.display='none'">
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
        <div style="font-weight: 700; color: var(--accent); font-size: 1.1em;">Secret Admin backdoor console</div>
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
  if (!state.isAdmin) { Router.navigate('/login'); return; }
  const view = state.ui.adminView;
  const pendingPayments = (state.allProofs || []).filter(p => p.status === 'pending').length;
  const pendingAds = (state.allAds || []).filter(a => a.status === 'pending').length;
  const pendingBrands = (state.allUsers || []).filter(u => u.role === 'brand' && u.verification_pending).length;

  const navItems = [
    { key: 'overview', icon: '📊', label: 'Overview', onClick: "switchAdminView('overview')" },
    { key: 'brands', icon: '🛡️', label: 'Brand Approvals', onClick: "switchAdminView('brands')", badge: pendingBrands || null },
    { key: 'vendors', icon: '🏪', label: 'Registered Accounts', onClick: "switchAdminView('vendors')" },
    { key: 'payments', icon: '💳', label: 'Payment Approvals', onClick: "switchAdminView('payments')", badge: pendingPayments || null },
    { key: 'products', icon: '📦', label: 'Stall Products', onClick: "switchAdminView('products')" },
    { key: 'ads', icon: '📢', label: 'Ad Broadcasts', onClick: "switchAdminView('ads')", badge: pendingAds || null },
    { key: 'conversations', icon: '💬', label: 'WhatsApp Chats', onClick: "switchAdminView('conversations')" },
    { key: 'broadcast', icon: '📢', label: 'Global Broadcast', onClick: "switchAdminView('broadcast')" },
    { key: 'settings', icon: '⚙️', label: 'Bot Settings', onClick: "switchAdminView('settings')" },
  ];
  const html = shellHtml({
    activeKey: view, navItems,
    topbarRight: {
      right: `
        <div class="avatar" style="background:var(--accent); color:var(--accent-ink)">AD</div>
        <button class="btn btn-ghost btn-sm" onclick="handleAdminLogout()">Log out</button>`
    },
    contentHtml: `<div id="admin-view-root"></div>`
  });
  document.getElementById('app').innerHTML = html;
  renderThemeToggleLabel();
  renderAdminView();
};

function switchAdminView(key) {
  state.ui.adminView = key;
  renderAdminView();
}

function renderAdminView() {
  const root = document.getElementById('admin-view-root');
  const view = state.ui.adminView;
  const renderers = {
    overview: adminOverviewView,
    brands: adminBrandsView,
    vendors: adminVendorsView,
    payments: adminPaymentsView,
    products: adminProductsView,
    ads: adminAdsView,
    conversations: adminConversationsView,
    broadcast: adminBroadcastView,
    settings: adminSettingsView
  };
  root.innerHTML = renderers[view] ? renderers[view]() : '';

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const idx = ['overview', 'brands', 'vendors', 'payments', 'products', 'ads', 'conversations', 'broadcast', 'settings'].indexOf(view);
  const navEls = document.querySelectorAll('.sidebar .nav-item');
  if (navEls[idx]) navEls[idx].classList.add('active');

  if (view === 'conversations' && state.ui.activeConversationPhone) renderConversationDetail();
}

/* ================================================================
   ADMIN VIEW MARKUPS & LOGIC
   ================================================================ */
function adminOverviewView() {
  const s = state.stats || {};
  const users = state.allUsers || [];

  const planCounts = { basic: 0, boost: 0, prime: 0, none: 0 };
  users.forEach(u => {
    if (u.role === 'vendor') {
      const plan = u.active_plan && planCounts.hasOwnProperty(u.active_plan) ? u.active_plan : 'none';
      planCounts[plan]++;
    }
  });

  const maxP = Math.max(1, ...Object.values(planCounts));

  return `
    <div class="view-head">
      <div><h1>Platform Overview</h1><div class="sub">Marketplace health statistics.</div></div>
      <div><button class="btn btn-ghost btn-sm" onclick="refreshAdminDashboard()">🔄 Refresh</button></div>
    </div>

    <div class="grid grid-4">
      <div class="stat-card"><span class="ic">🏪</span><div class="label">Stall Vendors</div><div class="value">${s.total_vendors || 0}</div></div>
      <div class="stat-card"><span class="ic">🏢</span><div class="label">Brand Advertisers</div><div class="value">${s.total_brands || 0}</div></div>
      <div class="stat-card"><span class="ic">📦</span><div class="label">Catalog Products</div><div class="value">${s.total_products || 0}</div></div>
      <div class="stat-card"><span class="ic">💬</span><div class="label">WhatsApp Shoppers</div><div class="value">${s.total_conversations || 0}</div></div>
    </div>

    <div class="grid grid-4" style="margin-top: 18px;">
      <div class="stat-card"><span class="ic">🧾</span><div class="label">Pending Payments</div><div class="value">${s.pending_proofs || 0}</div><div class="delta">top-ups review</div></div>
      <div class="stat-card"><span class="ic">📢</span><div class="label">Pending Ads</div><div class="value">${s.pending_ads || 0}</div><div class="delta">campaigns review</div></div>
      <div class="stat-card"><span class="ic">🛡️</span><div class="label">Pending Brands</div><div class="value">${s.pending_brands || 0}</div><div class="delta">verifications queue</div></div>
      <div class="stat-card"><span class="ic">🟢</span><div class="label">Active Running Ads</div><div class="value">${s.active_ads || 0}</div><div class="delta">broadcast automation</div></div>
    </div>

    <div class="grid grid-2" style="margin-top: 18px;">
      <div class="receipt">
        <div class="label">My Guy · Platform Financials</div>
        <div class="amount">${naira(s.total_revenue || 0)}</div>
        <div class="faint">Total platform deposits revenue (approved top-ups)</div>
        <div class="meta-row" style="margin-top: 15px;"><span>Vendor wallet liability</span><span class="num">${naira(s.total_wallet_balance || 0)}</span></div>
        <div class="barcode"></div>
      </div>

      <div class="card">
        <h3>Vendor distribution by Plan</h3>
        <div style="display:flex; flex-direction:column; gap:10px; margin-top: 10px;">
          ${Object.entries(planCounts).map(([k, v]) => `
            <div>
              <div class="flex-between faint"><span>${k.toUpperCase()}</span><span class="num">${v}</span></div>
              <div class="progress"><div style="width:${(v / maxP) * 100}%; background:${k === 'none' ? 'var(--line-strong)' : 'var(--primary)'};"></div></div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

/* -------- brand verification queue -------- */
function adminBrandsView() {
  // Get all users that are brands with verification pending
  const list = (state.allUsers || []).filter(u => u.role === 'brand' && u.verification_pending === true);

  return `
    <div class="view-head">
      <div><h1>Brand Approvals Queue</h1><div class="sub">Verify paid brand advertiser accounts. ${list.length} pending verification requests.</div></div>
      <div><button class="btn btn-ghost btn-sm" onclick="refreshAdminDashboard()">🔄 Refresh</button></div>
    </div>
    ${list.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Brand Name</th><th>Contact Person</th><th>WhatsApp Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(b => `
              <tr>
                <td><strong>${escapeHtml(b.business_name)}</strong></td>
                <td>${escapeHtml(b.contact_person || 'N/A')}</td>
                <td class="num">${escapeHtml(b.phone)}</td>
                <td>${escapeHtml(b.email)}</td>
                <td><span class="badge badge-wait">PENDING VERIFICATION</span></td>
                <td>
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn btn-money btn-xs" onclick="handleBrandReview('${b.id}','approve','${escapeHtml(b.business_name)}')">✅ Approve</button>
                    <button class="btn btn-danger btn-xs" onclick="handleBrandReview('${b.id}','reject','${escapeHtml(b.business_name)}')">❌ Reject</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    ` : emptyState('🛡️', 'Brands queue is empty', 'No brand verification requests are currently pending review. All brands have been verified.')}`;
}

async function handleBrandReview(uid, action, brandName) {
  const ok = await openModal({
    title: action === 'approve' ? `Verify ${brandName}?` : `Reject verification for ${brandName}?`,
    body: action === 'approve' ?
      'This will grant ad broadcast access to this brand. The brand will be marked as verified.' :
      'This will reject the verification request. The brand will remain unverified.',
    confirmText: action === 'approve' ? 'Approve Brand' : 'Reject',
    danger: action === 'reject'
  });
  if (!ok) return;

  try {
    const res = await API.adminReviewBrand(uid, action);
    if (res.success) {
      showToast(`Brand verification ${action}d successfully`, 'success');
      await refreshAdminDashboard();
    } else {
      showToast(res.error || 'Review failed', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

/* -------- registered accounts list -------- */
function filteredVendors() {
  let list = [...(state.allUsers || [])];
  const q = state.ui.vendorSearch.trim().toLowerCase();
  if (q) list = list.filter(u => (u.business_name + u.email + u.phone + (u.unique_id || '')).toLowerCase().includes(q));
  if (state.ui.vendorFilter === 'vendors') list = list.filter(u => u.role === 'vendor');
  if (state.ui.vendorFilter === 'brands') list = list.filter(u => u.role === 'brand');
  return list;
}

function adminVendorsView() {
  const list = filteredVendors();
  return `
    <div class="view-head">
      <div><h1>Registered Accounts</h1><div class="sub">${state.allUsers.length} total users registered.</div></div>
      <div><button class="btn btn-ghost btn-sm" onclick="refreshAdminDashboard()">🔄 Refresh</button></div>
    </div>
    <div class="toolbar">
      <div class="search-box"><span>🔎</span><input placeholder="Search ID, name, email, phone…" value="${escapeHtml(state.ui.vendorSearch)}" oninput="state.ui.vendorSearch=this.value; renderAdminView();"></div>
      <select class="input" onchange="state.ui.vendorFilter=this.value; renderAdminView();">
        <option value="all">All Roles</option>
        <option value="vendors" ${state.ui.vendorFilter === 'vendors' ? 'selected' : ''}>Vendors only</option>
        <option value="brands" ${state.ui.vendorFilter === 'brands' ? 'selected' : ''}>Brands only</option>
      </select>
    </div>
    ${list.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Unique ID</th><th>Role</th><th>Business/Brand Name</th><th>Contact Details</th><th>Balance</th><th>Plan / Verification</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${list.map(u => `
              <tr>
                <td class="num" style="font-weight: 700;">${escapeHtml(u.unique_id || '-')}</td>
                <td><span class="badge ${u.role === 'brand' ? 'badge-wait' : 'badge-plan'}">${u.role.toUpperCase()}</span></td>
                <td><b>${escapeHtml(u.business_name)}</b>${u.contact_person ? `<br><span class="faint">Contact: ${escapeHtml(u.contact_person)}</span>` : ''}</td>
                <td>${escapeHtml(u.email)}<br><span class="faint">${escapeHtml(u.phone)}</span></td>
                <td class="num">${naira(u.wallet_balance)}</td>
                <td>
                  ${u.role === 'brand' ?
                    (u.verified ? '<span class="badge badge-ok">Verified</span>' : (u.verification_pending ? '<span class="badge badge-wait">Pending</span>' : '<span class="badge badge-none">Unverified</span>')) :
                    (u.active_plan ? `<span class="badge badge-plan">${u.active_plan.toUpperCase()}</span>` : '<span class="badge badge-none">None</span>')}
                </td>
                <td><span class="badge ${u.status === 'active' ? 'badge-ok' : 'badge-off'}">${u.status.toUpperCase()}</span></td>
                <td>
                  <button class="btn btn-xs ${u.status === 'active' ? 'btn-danger' : 'btn-money'}" onclick="handleToggleVendor('${u.id}','${escapeHtml(u.business_name)}','${u.status}')">
                    ${u.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    ` : emptyState('🏪', 'No accounts found', 'No registered vendors or brands match your filter query.')}`;
}

async function handleToggleVendor(vendorId, name, status) {
  const ok = await openModal({
    title: status === 'active' ? `Suspend ${name}?` : `Reactivate ${name}?`,
    body: status === 'active' ? 'Their matching/broadcasting capabilities will be halted immediately.' : 'Stall features will be reactivated.',
    confirmText: status === 'active' ? 'Suspend Account' : 'Reactivate',
    danger: status === 'active'
  });
  if (!ok) return;
  try {
    const res = await API.adminToggleVendor(vendorId);
    if (res.success) {
      showToast('Account status updated', 'success');
      await refreshAdminDashboard();
    }
  } catch (err) { showToast('Action failed', 'error'); }
}

/* -------- payment approvals queue (brand payments included) -------- */
function adminPaymentsView() {
  let list = [...(state.allProofs || [])];
  if (state.ui.proofFilter !== 'all') list = list.filter(p => p.status === state.ui.proofFilter);
  const usersById = Object.fromEntries(state.allUsers.map(u => [u.id, u]));
  return `
    <div class="view-head">
      <div><h1>Payment Screenshot Approvals</h1><div class="sub">Authorize bank transfers to credit user wallets. All users (vendors & brands) appear here.</div></div>
      <div><button class="btn btn-ghost btn-sm" onclick="refreshAdminDashboard()">🔄 Refresh</button></div>
    </div>
    <div class="toolbar">
      <select class="input" onchange="state.ui.proofFilter=this.value; renderAdminView();">
        <option value="pending" ${state.ui.proofFilter === 'pending' ? 'selected' : ''}>Pending Only</option>
        <option value="all" ${state.ui.proofFilter === 'all' ? 'selected' : ''}>All deposits</option>
        <option value="approved" ${state.ui.proofFilter === 'approved' ? 'selected' : ''}>Approved Only</option>
        <option value="rejected" ${state.ui.proofFilter === 'rejected' ? 'selected' : ''}>Rejected Only</option>
      </select>
    </div>
    ${list.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>User Store/Brand</th><th>Role</th><th>Amount</th><th>Date</th><th>Screenshot</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(p => {
              const u = usersById[p.vendor_id];
              return `
                <tr>
                  <td><b>${u ? escapeHtml(u.business_name) : 'Unknown User (ID: ' + escapeHtml(p.vendor_id) + ')'}</b></td>
                  <td><span class="badge ${u && u.role === 'brand' ? 'badge-wait' : 'badge-plan'}">${u ? u.role.toUpperCase() : '?'}</span></td>
                  <td class="num"><b>${naira(p.amount)}</b></td>
                  <td>${(p.created_at || '').slice(0, 10)}</td>
                  <td><button class="btn btn-ghost btn-xs" onclick="openLightbox('${API_BASE}/static/uploads/proofs/${p.proof_image}')">View Proof</button></td>
                  <td><span class="badge ${p.status === 'approved' ? 'badge-ok' : p.status === 'pending' ? 'badge-wait' : 'badge-off'}">${p.status.toUpperCase()}</span></td>
                  <td>
                    ${p.status === 'pending' ? `
                      <div class="btn-group" style="display:flex; gap:6px;">
                        <button class="btn btn-money btn-xs" onclick="handleReviewPayment('${p.id}','approve','${naira(p.amount)}')">Approve</button>
                        <button class="btn btn-danger btn-xs" onclick="handleReviewPayment('${p.id}','reject','${naira(p.amount)}')">Reject</button>
                      </div>
                    ` : ''}
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : emptyState('💳', 'No deposit proofs', 'No transfer proofs match your filter queue.')}`;
}

async function handleReviewPayment(proofId, action, amountText) {
  const ok = await openModal({
    title: action === 'approve' ? `Credit ${amountText}?` : `Reject proof?`,
    body: action === 'approve' ? 'This credits the user wallet balance immediately.' : 'Proof screenshot is flagged as invalid.',
    confirmText: action === 'approve' ? 'Approve & Credit' : 'Reject Proof',
    danger: action === 'reject'
  });
  if (!ok) return;
  try {
    const res = await API.adminReviewPayment(proofId, action);
    if (res.success) {
      showToast(`Payment ${action}d successfully`, 'success');
      await refreshAdminDashboard();
    }
  } catch (err) { showToast('Action failed', 'error'); }
}

/* -------- stall catalog products -------- */
function adminProductsView() {
  let list = [...(state.allProducts || [])];
  if (state.ui.productSearch.trim()) {
    const q = state.ui.productSearch.toLowerCase();
    list = list.filter(p => p.title.toLowerCase().includes(q));
  }
  const usersById = Object.fromEntries(state.allUsers.map(u => [u.id, u]));
  return `
    <div class="view-head">
      <div><h1>All listed products</h1><div class="sub">${state.allProducts.length} items cataloged across stores.</div></div>
      <div><button class="btn btn-ghost btn-sm" onclick="refreshAdminDashboard()">🔄 Refresh</button></div>
    </div>
    <div class="toolbar">
      <div class="search-box"><span>🔎</span><input placeholder="Search product title…" value="${escapeHtml(state.ui.productSearch)}" oninput="state.ui.productSearch=this.value; renderAdminView();"></div>
    </div>
    ${list.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Product Title</th><th>Vendor Store</th><th>Price</th><th>Times shown</th><th>Visibility</th></tr></thead>
          <tbody>
            ${list.map(p => {
              const u = usersById[p.vendor_id];
              return `
                <tr>
                  <td><b>${escapeHtml(p.title)}</b></td>
                  <td>${u ? escapeHtml(u.business_name) : 'Unknown Store'}</td>
                  <td class="num">${naira(p.price)}</td>
                  <td class="num">${p.times_shown || 0}</td>
                  <td><span class="badge ${p.active ? 'badge-ok' : 'badge-off'}">${p.active ? 'Active' : 'Hidden'}</span></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : emptyState('📦', 'No products listed', 'No items listed match that query.')}`;
}

/* -------- ad manager approvals -------- */
function adStatusBadge(status) {
  const map = { pending: 'badge-wait', approved: 'badge-ok', rejected: 'badge-off' };
  return `<span class="badge ${map[status] || 'badge-off'}">${status.toUpperCase()}</span>`;
}

function adScheduleSummary(ad) {
  const s = ad.schedule || {};
  if (ad.status !== 'approved' || !s.frequency) return 'Not scheduled';
  const freqLabel = (state.adFrequencies[s.frequency] || {}).name || s.frequency;
  let extra = '';
  if (s.frequency === 'weekly' && (s.days || []).length) extra = ` on ${s.days.join(', ')}`;
  const activeLabel = ad.automation_active ? '🟢 Active' : '⏸️ Paused';
  return `${freqLabel}${extra} at ${s.time} · ${activeLabel}`;
}

function adminAdsView() {
  let list = [...(state.allAds || [])];
  if (state.ui.adFilter !== 'all') list = list.filter(a => a.status === state.ui.adFilter);
  const usersById = Object.fromEntries(state.allUsers.map(u => [u.id, u]));

  return `
    <div class="view-head">
      <div><h1>WhatsApp Ads Broadcast Queue</h1><div class="sub">Review ad drafts, schedule delivery automation, and manual broadcast.</div></div>
      <div><button class="btn btn-ghost btn-sm" onclick="refreshAdminDashboard()">🔄 Refresh</button></div>
    </div>
    <div class="toolbar">
      <select class="input" onchange="state.ui.adFilter=this.value; renderAdminView();">
        <option value="pending" ${state.ui.adFilter === 'pending' ? 'selected' : ''}>Pending approvals</option>
        <option value="all" ${state.ui.adFilter === 'all' ? 'selected' : ''}>All ad broadcasts</option>
        <option value="approved" ${state.ui.adFilter === 'approved' ? 'selected' : ''}>Approved & active</option>
        <option value="rejected" ${state.ui.adFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
      </select>
    </div>
    ${list.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Advertiser</th><th>Ad Message</th><th>Budget & Target</th><th>Status</th><th>Schedule Info</th><th>Delivery</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(a => {
              const u = usersById[a.vendor_id];
              return `
                <tr>
                  <td><b>${u ? escapeHtml(u.business_name) : 'Unknown'}</b><br><span class="badge ${u && u.role === 'brand' ? 'badge-wait' : 'badge-plan'}">${u ? u.role.toUpperCase() : '-'}</span></td>
                  <td>
                    <div style="font-weight: 700;">${escapeHtml(a.title)}</div>
                    <div class="faint" style="white-space: normal; max-width: 250px;">${escapeHtml(a.message)}</div>
                    ${a.image ? `<button class="btn btn-ghost btn-xs" style="margin-top: 4px;" onclick="openLightbox('${API_BASE}/static/uploads/ads/${a.image}')">View Ad Photo</button>` : ''}
                  </td>
                  <td><b>${naira(a.total_cost)}</b><br><span class="faint">Reach: ${a.weekly_reach} people</span><br><span class="faint">Type: ${a.ad_type.toUpperCase()}</span></td>
                  <td>${adStatusBadge(a.status)}${a.status === 'rejected' && a.rejection_reason ? `<div class="faint" style="margin-top:4px; color: var(--danger); font-size: 0.78em;">Reason: ${escapeHtml(a.rejection_reason)}</div>` : ''}</td>
                  <td><div style="font-size: 0.85em; white-space: normal; max-width: 150px;">${adScheduleSummary(a)}</div></td>
                  <td class="num">${a.times_sent || 0}× broadcasts</td>
                  <td>
                    <div class="btn-group" style="display:flex; gap:6px; flex-wrap:wrap; max-width: 160px;">
                      ${a.status === 'pending' ? `
                        <button class="btn btn-money btn-xs" onclick="openAdReviewModal('${a.id}')">Approve & Schedule</button>
                        <button class="btn btn-danger btn-xs" onclick="handleAdRejectPrompt('${a.id}')">Reject</button>
                      ` : ''}
                      ${a.status === 'approved' ? `
                        <button class="btn btn-ghost btn-xs" onclick="openAdReviewModal('${a.id}')">Edit Schedule</button>
                        <button class="btn ${a.automation_active ? 'btn-ghost' : 'btn-money'} btn-xs" onclick="handleToggleAdAutomation('${a.id}')">${a.automation_active ? 'Pause' : 'Resume'}</button>
                        <button class="btn btn-accent btn-xs" onclick="handleSendAdNow('${a.id}')">Broadcast Now</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : emptyState('📢', 'No advertisements found', 'No ads fit your filter parameters.')}`;
}

function openAdReviewModal(adId) {
  const ad = state.allAds.find(a => a.id === adId);
  if (!ad) return;
  state.ui.reviewingAdId = adId;
  const s = ad.schedule || {};
  const freq = s.frequency || 'daily';
  const root = document.getElementById('modal-root');
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  root.innerHTML = `
    <div class="modal-backdrop show" id="active-modal">
      <div class="modal modal-lg" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>${ad.status === 'pending' ? 'Approve & Schedule Ad' : 'Modify Ad Automation Schedule'}</h3></div>
        <div class="modal-body">
          <form id="ad-schedule-form" onsubmit="return handleApproveAd(event, '${adId}')">
            <div class="field">
              <label>Broadcasting Frequency</label>
              <select class="input" id="ad-sched-frequency" onchange="renderAdWeekdayField()">
                <option value="once" ${freq === 'once' ? 'selected' : ''}>Send once (Immediately on scheduled time)</option>
                <option value="daily" ${freq === 'daily' ? 'selected' : ''}>Every day (Daily broadcast)</option>
                <option value="weekly" ${freq === 'weekly' ? 'selected' : ''}>Specific weekdays</option>
              </select>
            </div>
            <div class="field"><label>Time of day (Local Server Time)</label><input class="input" type="time" id="ad-sched-time" value="${s.time || '09:00'}" required></div>
            <div class="field" id="ad-sched-days-field" style="display:${freq === 'weekly' ? 'block' : 'none'};">
              <label>Days of the week</label>
              <div class="chip-input" style="flex-wrap:wrap; gap:6px; padding:8px;">
                ${weekdays.map(d => `<label style="display:inline-flex; align-items:center; gap:4px; margin-right:8px; cursor: pointer;"><input type="checkbox" class="ad-sched-day" value="${d}" ${(s.days || []).includes(d) ? 'checked' : ''}> ${d.toUpperCase()}</label>`).join('')}
              </div>
            </div>
            <div class="field"><label>Start Date</label><input class="input" type="date" id="ad-sched-start" value="${s.start_date || ''}"></div>
            <div class="field"><label>End Date <span class="faint">(optional)</span></label><input class="input" type="date" id="ad-sched-end" value="${s.end_date || ''}"></div>
          </form>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="closeCustomModal()">Cancel</button>
          <button class="btn btn-primary" id="ad-schedule-submit" onclick="document.getElementById('ad-schedule-form').requestSubmit()">${ad.status === 'pending' ? 'Approve ad broadcast' : 'Save schedule settings'}</button>
        </div>
      </div>
    </div>`;
}

function renderAdWeekdayField() {
  const field = document.getElementById('ad-sched-days-field');
  const freq = document.getElementById('ad-sched-frequency').value;
  if (field) field.style.display = freq === 'weekly' ? 'block' : 'none';
}

async function handleApproveAd(e, adId) {
  e.preventDefault();
  const btn = document.getElementById('ad-schedule-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Saving…';
  const ad = state.allAds.find(a => a.id === adId);
  const schedule = {
    frequency: document.getElementById('ad-sched-frequency').value,
    time: document.getElementById('ad-sched-time').value,
    days: Array.from(document.querySelectorAll('.ad-sched-day:checked')).map(el => el.value),
    start_date: document.getElementById('ad-sched-start').value,
    end_date: document.getElementById('ad-sched-end').value
  };
  try {
    const res = ad.status === 'pending' ? await API.adminApproveAd(adId, schedule) : await API.adminSetAdSchedule(adId, schedule);
    if (res.success) {
      showToast('Ad scheduled and approved', 'success');
      closeCustomModal();
      await refreshAdminDashboard();
    } else {
      showToast(res.error || 'Failed to save', 'error');
      btn.disabled = false; btn.textContent = 'Save schedule';
    }
  } catch (err) {
    showToast('Network error', 'error');
    btn.disabled = false; btn.textContent = 'Save schedule';
  }
}

async function handleAdRejectPrompt(adId) {
  const reason = prompt("Enter rejection feedback reason for vendor/brand:");
  if (reason === null) return;
  try {
    const res = await API.adminRejectAd(adId, reason);
    if (res.success) {
      showToast('Ad rejected and status logged', 'success');
      await refreshAdminDashboard();
    }
  } catch (err) { showToast('Action failed', 'error'); }
}

async function handleToggleAdAutomation(adId) {
  try {
    const res = await API.adminToggleAdAutomation(adId);
    if (res.success) {
      showToast('Automation status updated', 'success');
      await refreshAdminDashboard();
    }
  } catch (err) { showToast('Action failed', 'error'); }
}

async function handleSendAdNow(adId) {
  const ok = await openModal({ title: 'Manual Ad Broadcast?', body: 'Are you sure you want to broadcast this ad out to all shoppers right now? This is non-reversible.', confirmText: 'Send Now' });
  if (!ok) return;
  try {
    const res = await API.adminSendAdNow(adId);
    if (res.success) {
      showToast(`Broadcasted successfully to ${res.sent} contacts`, 'success');
      await refreshAdminDashboard();
    }
  } catch (err) { showToast('Action failed', 'error'); }
}

/* -------- whatsapp conversations viewer -------- */
function adminConversationsView() {
  let list = [...(state.conversations || [])];
  if (state.ui.conversationSearch.trim()) {
    const q = state.ui.conversationSearch.toLowerCase();
    list = list.filter(c => c.phone.includes(q));
  }
  return `
    <div class="view-head">
      <div><h1>WhatsApp Chats Tracker</h1><div class="sub">Real-time view of customer conversations with the assistant bot.</div></div>
      <div><button class="btn btn-ghost btn-sm" onclick="refreshAdminDashboard()">🔄 Refresh</button></div>
    </div>
    <div class="grid grid-2" style="align-items:start;">
      <div class="card" style="padding:0; overflow:hidden;">
        <div style="padding:16px;"><div class="search-box"><span>🔎</span><input placeholder="Search phone number…" value="${escapeHtml(state.ui.conversationSearch)}" oninput="state.ui.conversationSearch=this.value; renderAdminView();"></div></div>
        <div style="max-height:520px; overflow-y:auto; display:flex; flex-direction:column;">
          ${list.length ? list.map(c => `
            <div onclick="viewConversation('${c.phone}')" style="padding:12px 16px; border-top:1px solid var(--line); cursor:pointer; ${state.ui.activeConversationPhone === c.phone ? 'background:var(--primary-soft);' : ''}">
              <div class="flex-between"><b style="font-size:.9em;">${escapeHtml(c.phone)}</b><span class="faint">${timeAgo(c.last_time)}</span></div>
              <div class="flex-between" style="align-items:center;">
                <div class="faint" style="margin-top:2px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:200px;">${escapeHtml(c.last_message || '')}</div>
                ${c.paused ? '<span class="badge badge-wait" style="margin-left:6px;">Paused</span>' : ''}
              </div>
            </div>`).join('') : `<div style="padding:24px;">${emptyState('💬', 'No conversations', 'Conversations will populate as WhatsApp requests arrive.')}</div>`}
        </div>
      </div>
      <div class="card" id="conversation-detail-card">
        ${state.ui.activeConversationPhone ? '<div id="conversation-detail-inner"></div>' : emptyState('👈', 'Select a conversation', 'Click a phone number on the left list panel to load their chat transcript.')}
      </div>
    </div>`;
}

async function viewConversation(phone) {
  state.ui.activeConversationPhone = phone;
  renderAdminView();
  try {
    const data = await API.adminGetConversation(phone);
    state.conversationDetail = data.messages || [];
    renderConversationDetail();
  } catch (err) { showToast('Failed to load logs', 'error'); }
}

async function refreshConversationDetail(phone) {
  try {
    const data = await API.adminGetConversation(phone);
    state.conversationDetail = data.messages || [];
    renderConversationDetail();
    showToast('Transcript refreshed', 'success');
  } catch (err) { showToast('Failed to refresh transcript', 'error'); }
}

function renderConversationDetail() {
  const el = document.getElementById('conversation-detail-inner');
  if (!el) return;
  const msgs = state.conversationDetail || [];
  const phone = state.ui.activeConversationPhone;
  const conv = (state.conversations || []).find(c => c.phone === phone);
  const isPaused = !!(conv && conv.paused);

  el.innerHTML = `
    <div class="flex-between" style="margin-bottom:12px; flex-wrap:wrap; gap:8px;">
      <h3 style="margin:0;">${escapeHtml(phone)} ${isPaused ? '<span class="badge badge-wait">AI Paused</span>' : ''}</h3>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn btn-ghost btn-xs" onclick="refreshConversationDetail('${phone}')">🔄 Refresh</button>
        <a href="https://wa.me/${phone.replace(/[^0-9]/g,'')}" target="_blank" class="btn btn-whatsapp btn-xs">Open WhatsApp</a>
        <button class="btn ${isPaused ? 'btn-money' : 'btn-ghost'} btn-xs" onclick="togglePauseChat('${phone}')">${isPaused ? '▶️ Resume AI' : '⏸️ Pause AI'}</button>
        <button class="btn btn-primary btn-xs" onclick="openAdminReplyModal('${phone}')">Reply</button>
      </div>
    </div>
    ${isPaused ? '<div class="hint" style="margin-bottom:10px;">AI replies are paused for this customer only — other conversations are unaffected. Use Reply to talk to them directly.</div>' : ''}
    <div class="chat-panel">
      ${msgs.length ? msgs.map(m => `
        <div class="bubble-row ${m.role === 'user' ? 'in' : m.role === 'admin' ? 'out admin' : 'out'}">
          <div class="bubble">${escapeHtml(m.message)}<span class="time">${(m.timestamp || '').slice(11, 16)}</span></div>
          ${m.role === 'admin' ? '<div class="admin-label">Admin Reply</div>' : ''}
        </div>`).join('') : '<div class="faint" style="text-align:center;padding:40px 0;">No messages logged</div>'}
    </div>`;
}

async function togglePauseChat(phone) {
  try {
    const res = await API.adminTogglePause(phone);
    if (res.success) {
      let conv = (state.conversations || []).find(c => c.phone === phone);
      if (conv) {
        conv.paused = res.paused;
      } else {
        state.conversations = state.conversations || [];
        state.conversations.push({ phone, count: 0, last_message: '', last_time: '', paused: res.paused });
      }
      // Keep the durable admin session in sync.
      const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
      sessionData.conversations = state.conversations;
      localStorage.setItem('adminSession', JSON.stringify(sessionData));
      showToast(res.paused ? 'AI paused for this chat' : 'AI resumed for this chat', 'success');
      renderConversationDetail();
    } else {
      showToast('Failed to update chat', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

function openAdminReplyModal(phone) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop show" id="active-modal">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>Reply to Customer</h3></div>
        <div class="modal-body">
          <p class="subtitle" style="margin-bottom:15px;">Replying to: <strong>${escapeHtml(phone)}</strong></p>
          <div class="field">
            <label>Message</label>
            <textarea class="input" id="admin-reply-message" rows="4" placeholder="Type your reply here..." maxlength="600"></textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="closeCustomModal()">Cancel</button>
          <button class="btn btn-whatsapp" onclick="sendAdminReply('${phone}')">Send Reply</button>
        </div>
      </div>
    </div>`;
}

async function sendAdminReply(phone) {
  const message = document.getElementById('admin-reply-message').value.trim();
  if (!message) {
    showToast('Please type a message', 'error');
    return;
  }

  const btn = document.querySelector('#modal-confirm') || document.querySelector('.btn-whatsapp');
  if (btn) btn.disabled = true;

  try {
    const res = await API.adminReply(phone, message);
    if (res.success) {
      showToast('Reply sent successfully!', 'success');
      closeCustomModal();
      await viewConversation(phone);
    } else {
      showToast(res.error || 'Failed to send reply', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
  if (btn) btn.disabled = false;
}

/* -------- global broadcast page -------- */
function adminBroadcastView() {
  const count = (state.conversations || []).length;
  return `
    <div class="view-head">
      <div><h1>Global WhatsApp Broadcast</h1><div class="sub">Send a direct text broadcast to all shoppers.</div></div>
      <div><button class="btn btn-ghost btn-sm" onclick="refreshAdminDashboard()">🔄 Refresh</button></div>
    </div>
    <div class="card" style="max-width:560px;">
      <form id="broadcast-form" onsubmit="return handleBroadcast(event)">
        <div class="field">
          <label>Broadcast text message</label>
          <textarea class="input" id="broadcast-message" rows="6" required maxlength="600" placeholder="Type your update or promo notice here…" oninput="document.getElementById('bc-count').textContent=this.value.length"></textarea>
          <div class="hint"><span id="bc-count">0</span>/600 characters limit</div>
        </div>
        <div class="banner banner-success show" style="background:var(--accent-soft); color:var(--accent-ink);">Will broadcast to <b>${count}</b> active WhatsApp thread${count === 1 ? '' : 's'}.</div>
        <button type="submit" class="btn btn-whatsapp btn-full" id="broadcast-submit">Broadcast message now</button>
      </form>
    </div>`;
}

async function handleBroadcast(e) {
  e.preventDefault();
  const msg = document.getElementById('broadcast-message').value.trim();
  if (!msg) return;
  const count = (state.conversations || []).length;
  const ok = await openModal({ title: 'Send Global Broadcast?', body: `This will push a WhatsApp message to all <b>${count}</b> customer chats. This action is non-reversible.`, confirmText: 'Send Now', danger: true });
  if (!ok) return;

  const btn = document.getElementById('broadcast-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Broadcasting…';
  try {
    const res = await API.adminBroadcast(msg);
    if (res.success) {
      showToast(`Pushed to ${res.sent} chats successfully`, 'success');
      document.getElementById('broadcast-message').value = '';
      document.getElementById('bc-count').textContent = '0';
    }
  } catch (err) { showToast('Broadcast failed', 'error'); }
  btn.disabled = false; btn.textContent = 'Broadcast message now';
}

/* -------- config settings -------- */
function adminSettingsView() {
  const s = state.settings || {};
  const webhookUrl = window.location.origin + '/webhook';
  const provider = s.api_provider || 'deepseek';
  
  return `
    <div class="view-head"><div><h1>Bot & Integration Settings</h1><div class="sub">Control endpoints, API keys, and assistant behaviors.</div></div></div>
    <form onsubmit="return handleSaveSettings(event)">
      <div class="card">
        <h3>📱 Meta WhatsApp Cloud API Setup</h3>
        <div class="field">
          <label>Webhook URL <span class="faint">(Configure in Meta Developer App Settings)</span></label>
          <div style="display:flex; gap:8px;">
            <input class="input" readonly value="${webhookUrl}" style="font-family:var(--font-mono); font-size:.82em;">
            <button type="button" class="btn btn-ghost btn-sm" onclick="copyText('${webhookUrl}','Copied webhook endpoint')">Copy</button>
          </div>
        </div>
        <div class="field"><label>Permanent WhatsApp Token</label>
          <div class="input-wrap"><input class="input" type="password" id="settings-whatsapp-token" value="${escapeHtml(s.whatsapp_token || '')}" required><button type="button" class="input-toggle" onclick="togglePw('settings-whatsapp-token',this)">Show</button></div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label>Phone Number ID</label><input class="input" id="settings-phone-number-id" value="${escapeHtml(s.phone_number_id || '')}" required></div>
          <div class="field"><label>Verify Token</label><input class="input" id="settings-verify-token" value="${escapeHtml(s.verify_token || '')}" required></div>
        </div>
      </div>

      <div class="card">
        <h3>🤖 AI Provider Configuration</h3>
        <div class="field">
          <label>AI Provider</label>
          <select class="input" id="settings-api-provider">
            <option value="deepseek" ${provider === 'deepseek' ? 'selected' : ''}>DeepSeek (Faster, Cheaper) ⚡</option>
            <option value="openrouter" ${provider === 'openrouter' ? 'selected' : ''}>OpenRouter (Multi-model)</option>
          </select>
        </div>
        
        <!-- OpenRouter Settings -->
        <div id="openrouter-settings" style="${provider === 'openrouter' ? '' : 'display:none;'}">
          <div class="field"><label>OpenRouter API Key</label>
            <div class="input-wrap"><input class="input" type="password" id="settings-openrouter-key" value="${escapeHtml(s.openrouter_api_key || '')}" placeholder="sk-or-v1-..."><button type="button" class="input-toggle" onclick="togglePw('settings-openrouter-key',this)">Show</button></div>
          </div>
          <div class="field"><label>OpenRouter Model</label>
            <input class="input" id="settings-openrouter-model" value="${escapeHtml(s.openrouter_model || 'deepseek/deepseek-r1')}" placeholder="e.g., deepseek/deepseek-r1">
          </div>
        </div>
        
        <!-- DeepSeek Settings -->
        <div id="deepseek-settings" style="${provider === 'deepseek' ? '' : 'display:none;'}">
          <div class="field"><label>DeepSeek API Key</label>
            <div class="input-wrap"><input class="input" type="password" id="settings-deepseek-key" value="${escapeHtml(s.deepseek_api_key || '')}" placeholder="sk-..."><button type="button" class="input-toggle" onclick="togglePw('settings-deepseek-key',this)">Show</button></div>
          </div>
          <div class="field"><label>DeepSeek Model</label>
            <select class="input" id="settings-deepseek-model">
              <option value="deepseek-chat" ${s.deepseek_model === 'deepseek-chat' ? 'selected' : ''}>DeepSeek Chat (Fast)</option>
              <option value="deepseek-coder" ${s.deepseek_model === 'deepseek-coder' ? 'selected' : ''}>DeepSeek Coder (Technical)</option>
            </select>
          </div>
          <div class="hint">💡 DeepSeek is faster and cheaper than OpenRouter. Get your API key from <a href="https://platform.deepseek.com/api_keys" target="_blank">platform.deepseek.com</a></div>
        </div>
      </div>

      <div class="card">
        <h3>💬 Bot Agent Identity</h3>
        <div class="field"><label>Bot Display Name</label><input class="input" id="settings-bot-name" value="${escapeHtml(s.bot_name || '')}"></div>
        <div class="field"><label>Welcome Message</label><textarea class="input" id="settings-welcome-message" rows="2">${escapeHtml(s.welcome_message || '')}</textarea></div>
        <div class="field"><label>System Instruction Prompt</label><textarea class="input" id="settings-system-prompt" rows="3">${escapeHtml(s.system_prompt || '')}</textarea></div>
      </div>

      <div class="card">
        <h3>🔑 Backdoor Admin Security</h3>
        <div class="field"><label>Update password <span class="faint">(leave blank to keep current)</span></label>
          <div class="input-wrap"><input class="input" type="password" id="settings-admin-password" placeholder="••••••••"><button type="button" class="input-toggle" onclick="togglePw('settings-admin-password',this)">Show</button></div>
        </div>
      </div>
      <button type="submit" class="btn btn-primary" id="settings-submit">Save Settings Config</button>
    </form>`;
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('settings-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Saving…';
  const settings = {
    whatsapp_token: document.getElementById('settings-whatsapp-token').value,
    phone_number_id: document.getElementById('settings-phone-number-id').value,
    verify_token: document.getElementById('settings-verify-token').value,
    api_provider: document.getElementById('settings-api-provider').value,
    openrouter_api_key: document.getElementById('settings-openrouter-key').value,
    openrouter_model: document.getElementById('settings-openrouter-model').value,
    deepseek_api_key: document.getElementById('settings-deepseek-key').value,
    deepseek_model: document.getElementById('settings-deepseek-model').value,
    bot_name: document.getElementById('settings-bot-name').value,
    welcome_message: document.getElementById('settings-welcome-message').value,
    system_prompt: document.getElementById('settings-system-prompt').value,
  };
  const newPassword = document.getElementById('settings-admin-password').value;
  if (newPassword) settings.new_admin_password = newPassword;
  try {
    const res = await API.adminSaveSettings(settings);
    if (res.success) {
      showToast('Settings saved successfully', 'success');
      state.settings = res.settings || {};
      // Update the durable admin session.
      const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
      sessionData.settings = res.settings || {};
      localStorage.setItem('adminSession', JSON.stringify(sessionData));
    }
  } catch (err) { showToast('Action failed', 'error'); }
  btn.disabled = false; btn.textContent = 'Save Settings Config';
}

/* ================================================================
   AUTH CHECK WITH RETRY LOGIC
   ================================================================ */
async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/status`, {
      credentials: 'include'
    });
    
    if (res.status === 401) {
      // Server says not logged in – show login
      return false;
    }
    
    if (!res.ok) {
      // Any other error (500, etc.) – keep current UI, retry in 2s
      console.warn('Auth check failed, retrying...');
      setTimeout(checkAuth, 2000);
      return true; // assume still logged in to avoid flashing logout
    }
    
    const data = await res.json();
    if (data.admin && data.is_admin) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    // Network error – don't log out, just retry
    console.warn('Network error during auth check, retrying...', e);
    setTimeout(checkAuth, 3000);
    return true; // preserve UI state
  }
}

/* ================================================================
   DASHBOARD REFRESH
   ================================================================ */
async function refreshAdminDashboard() {
  try {
    const data = await API.adminDashboard();
    if (data.success) {
      Object.assign(state, {
        isAdmin: true,
        stats: data.stats || {},
        allUsers: data.users || [],
        allProducts: data.products || [],
        allProofs: data.proofs || [],
        allAds: data.ads || [],
        adFrequencies: data.ad_frequencies || {},
        conversations: data.conversations || [],
        settings: data.settings || {}
      });
      // Update sessionStorage
      const sessionData = {
        isAdmin: true,
        stats: data.stats || {},
        allUsers: data.users || [],
        allProducts: data.products || [],
        allProofs: data.proofs || [],
        allAds: data.ads || [],
        adFrequencies: data.ad_frequencies || {},
        conversations: data.conversations || [],
        settings: data.settings || {}
      };
      localStorage.setItem('adminSession', JSON.stringify(sessionData));
      Pages.dashboard();
    }
  } catch (err) { console.error('Dashboard refresh failed:', err); }
}

/* ================================================================
   ROUTER MAPPINGS & RUNNERS
   ================================================================ */
Router.add('/login', Pages.login);
Router.add('/dashboard', Pages.dashboard);

initTheme();

// Check for existing session on load
document.addEventListener('DOMContentLoaded', async () => {
  // Check the durable session first.
  const savedSession = localStorage.getItem('adminSession');
  if (savedSession) {
    try {
      const sessionData = JSON.parse(savedSession);
      if (sessionData.isAdmin) {
        // Restore cached state immediately for a fast paint...
        Object.assign(state, sessionData);
        Router.navigate('/dashboard');
        // ...then always sync fresh data from the server in the background,
        // so new top-ups, chats, etc. submitted since the last login show up
        // without requiring a manual refresh click.
        refreshAdminDashboard();
        
        // Also verify the session is still valid on the server
        const isValid = await checkAuth();
        if (!isValid) {
          // Server says session expired - clear local state and redirect to login
          localStorage.removeItem('adminSession');
          state.isAdmin = false;
          Router.navigate('/login');
        }
        return;
      }
    } catch (e) {}
  }

  // Then check server session
  try {
    const data = await API.adminDashboard();
    if (data.success && data.is_admin) {
      Object.assign(state, {
        isAdmin: true,
        stats: data.stats || {},
        allUsers: data.users || [],
        allProducts: data.products || [],
        allProofs: data.proofs || [],
        allAds: data.ads || [],
        adFrequencies: data.ad_frequencies || {},
        conversations: data.conversations || [],
        settings: data.settings || {}
      });
      // Save the durable session.
      const sessionData = {
        isAdmin: true,
        stats: data.stats || {},
        allUsers: data.users || [],
        allProducts: data.products || [],
        allProofs: data.proofs || [],
        allAds: data.ads || [],
        adFrequencies: data.ad_frequencies || {},
        conversations: data.conversations || [],
        settings: data.settings || {}
      };
      localStorage.setItem('adminSession', JSON.stringify(sessionData));
      Router.navigate('/dashboard');
      return;
    }
  } catch (e) {}

  // Only navigate to login if no session exists
  Router.navigate('/login');
});

// Provider toggle for settings page
document.addEventListener('change', function(e) {
  if (e.target.id === 'settings-api-provider') {
    const openrouterDiv = document.getElementById('openrouter-settings');
    const deepseekDiv = document.getElementById('deepseek-settings');
    if (e.target.value === 'deepseek') {
      if (openrouterDiv) openrouterDiv.style.display = 'none';
      if (deepseekDiv) deepseekDiv.style.display = 'block';
    } else {
      if (openrouterDiv) openrouterDiv.style.display = 'block';
      if (deepseekDiv) deepseekDiv.style.display = 'none';
    }
  }
});

Router.init();