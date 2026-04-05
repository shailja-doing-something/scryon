/* ── Scryon Lens — Content Script ── */

const OVERLAY_ID = 'scryon-lens-overlay';
let conversationHistory = [];
let isMinimised = false;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let currentPosition = null; // { right, top } saved position

// ── Toggle ────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'TOGGLE_SCRYON_LENS') {
    toggleOverlay();
  }
});

function toggleOverlay() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    removeOverlay();
  } else {
    openOverlay();
  }
}

// ── Open ──────────────────────────────────────────────────────────────────

function openOverlay() {
  chrome.storage.sync.get(['scryon_url', 'scryon_token'], (cfg) => {
    const overlay = buildOverlayShell(cfg);
    document.body.appendChild(overlay);
    restorePosition(overlay);
    setupDrag(overlay);
    setupEscape();

    if (!cfg.scryon_url || !cfg.scryon_token) {
      showError(overlay, 'Scryon not connected. Configure URL in <a href="#" id="sl-open-popup">extension settings</a>.');
      const link = overlay.querySelector('#sl-open-popup');
      if (link) link.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }); });
      return;
    }

    showSkeletons(overlay);
    fetchSummary(cfg.scryon_url, cfg.scryon_token)
      .then((data) => renderBrief(overlay, data))
      .catch(() => showError(overlay, 'Could not reach Scryon. Check your URL and token in extension settings.'));
  });
}

// ── Build overlay HTML shell ──────────────────────────────────────────────

function buildOverlayShell(cfg) {
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <!-- Header -->
    <div class="sl-header" id="sl-drag-handle">
      <span class="sl-header-icon">✦</span>
      <span class="sl-header-title">Scryon Lens</span>
      <button class="sl-header-btn" id="sl-minimise-btn" title="Minimise">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button class="sl-header-btn" id="sl-close-btn" title="Close (Esc)">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Date bar -->
    <div class="sl-datebar" id="sl-datebar">
      <span class="sl-datebar-date" id="sl-date">Loading…</span>
    </div>

    <!-- Brief cards (hidden when minimised) -->
    <div class="sl-brief" id="sl-brief-area"></div>

    <!-- Chat divider -->
    <div class="sl-chat-divider" id="sl-chat-divider"></div>

    <!-- Chat header -->
    <div class="sl-chat-header" id="sl-chat-header-row">
      <span class="sl-chat-dot"></span>
      <span class="sl-chat-label">Ask Scryon AI</span>
    </div>

    <!-- Messages -->
    <div class="sl-messages" id="sl-messages">
      <span class="sl-msg-welcome">Ask about today's brief, tracker, or patterns.</span>
    </div>

    <!-- Input bar -->
    <div class="sl-input-bar">
      <input
        id="scryon-lens-input"
        class="sl-input"
        type="text"
        placeholder="Ask anything about today's brief..."
        autocomplete="off"
      />
      <button class="sl-send-btn" id="sl-send-btn" disabled>
        <svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
      </button>
    </div>
  `;

  // Close
  overlay.querySelector('#sl-close-btn').addEventListener('click', () => removeOverlay());

  // Minimise
  overlay.querySelector('#sl-minimise-btn').addEventListener('click', () => toggleMinimise(overlay));

  // Input
  const input = overlay.querySelector('#scryon-lens-input');
  const sendBtn = overlay.querySelector('#sl-send-btn');

  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      e.stopPropagation();
      sendChat(overlay, input.value.trim(), cfg);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      removeOverlay();
    }
  });

  sendBtn.addEventListener('click', () => {
    if (input.value.trim()) sendChat(overlay, input.value.trim(), cfg);
  });

  return overlay;
}

// ── Minimise / restore ────────────────────────────────────────────────────

function toggleMinimise(overlay) {
  isMinimised = !isMinimised;
  const briefArea = overlay.querySelector('#sl-brief-area');
  const chatDivider = overlay.querySelector('#sl-chat-divider');
  const chatHeader = overlay.querySelector('#sl-chat-header-row');
  const messages = overlay.querySelector('#sl-messages');
  const inputBar = overlay.querySelector('.sl-input-bar');

  if (isMinimised) {
    overlay.classList.add('scryon-minimised');
    [briefArea, chatDivider, chatHeader, messages, inputBar].forEach((el) => { if (el) el.style.display = 'none'; });
  } else {
    overlay.classList.remove('scryon-minimised');
    [briefArea, chatDivider, chatHeader, messages].forEach((el) => { if (el) el.style.display = ''; });
    if (inputBar) inputBar.style.display = '';
  }
}

// ── Remove ────────────────────────────────────────────────────────────────

function removeOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;
  overlay.classList.add('scryon-closing');
  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  setTimeout(() => overlay.remove(), 300); // fallback
}

// ── Escape key ────────────────────────────────────────────────────────────

function setupEscape() {
  const handler = (e) => {
    if (e.key === 'Escape') {
      removeOverlay();
      document.removeEventListener('keydown', handler);
    }
  };
  document.addEventListener('keydown', handler);
}

// ── Drag ──────────────────────────────────────────────────────────────────

function setupDrag(overlay) {
  const handle = overlay.querySelector('#sl-drag-handle');

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.sl-header-btn')) return;
    isDragging = true;
    const rect = overlay.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    overlay.style.transition = 'none';
    // Switch from right-anchored to left-anchored for free movement
    overlay.style.right = 'auto';
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.transform = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;
    overlay.style.left = Math.max(0, Math.min(x, window.innerWidth - overlay.offsetWidth)) + 'px';
    overlay.style.top = Math.max(0, Math.min(y, window.innerHeight - overlay.offsetHeight)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    overlay.style.transition = '';
    // Save position
    currentPosition = { left: overlay.style.left, top: overlay.style.top };
    chrome.storage.local.set({ scryon_lens_position: currentPosition });
  });
}

function restorePosition(overlay) {
  chrome.storage.local.get(['scryon_lens_position'], (res) => {
    if (res.scryon_lens_position) {
      const pos = res.scryon_lens_position;
      overlay.style.right = 'auto';
      overlay.style.left = pos.left;
      overlay.style.top = pos.top;
      overlay.style.transform = 'none';
    }
  });
}

// ── Fetch summary ─────────────────────────────────────────────────────────

async function fetchSummary(baseUrl, token) {
  const url = baseUrl.replace(/\/$/, '') + '/api/extension/summary';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

// ── Render ────────────────────────────────────────────────────────────────

function showSkeletons(overlay) {
  const dateEl = overlay.querySelector('#sl-date');
  if (dateEl) dateEl.textContent = 'Connecting to Scryon…';

  const area = overlay.querySelector('#sl-brief-area');
  area.innerHTML = `
    <div class="sl-skeleton sl-skeleton-card"></div>
    <div class="sl-skeleton sl-skeleton-card"></div>
    <div class="sl-skeleton sl-skeleton-card"></div>
  `;
}

function showError(overlay, html) {
  const dateEl = overlay.querySelector('#sl-date');
  if (dateEl) dateEl.textContent = 'Not connected';

  const area = overlay.querySelector('#sl-brief-area');
  area.innerHTML = `<div class="sl-error">${html}</div>`;
}

function renderBrief(overlay, data) {
  // Date bar
  const dateEl = overlay.querySelector('#sl-date');
  if (dateEl) {
    dateEl.innerHTML = `
      <span class="sl-datebar-date">${data.date}</span>
      <span class="sl-datebar-dot">·</span>
      <span class="sl-datebar-stat"><strong>${data.totalDevelopments}</strong> developments</span>
      <span class="sl-datebar-dot">·</span>
      <span class="sl-datebar-stat">Avg score: <strong>${data.avgScore}</strong></span>
      <span class="sl-datebar-dot">·</span>
      <span class="sl-datebar-stat"><strong>${data.ideasInTracker}</strong> ideas tracked</span>
    `;
  }

  // Cards
  const area = overlay.querySelector('#sl-brief-area');
  area.innerHTML = '';

  if (!data.topDevelopments || data.topDevelopments.length === 0) {
    area.innerHTML = '<div class="sl-error">No developments in today\'s brief yet.</div>';
    return;
  }

  data.topDevelopments.forEach((dev, i) => {
    const card = document.createElement('div');
    card.className = 'sl-card';
    card.dataset.expanded = 'false';

    const ideasHtml = (dev.immediateIdeas || []).slice(0, 3).map((idea) =>
      `<div class="sl-idea-item">${escapeHtml(idea)}</div>`
    ).join('');

    card.innerHTML = `
      <div class="sl-card-top">
        <span class="sl-rank">${dev.rank || i + 1}</span>
        <span class="sl-score">${formatScore(dev.score)}</span>
        <span class="sl-card-title" title="${escapeHtml(dev.title)}">${escapeHtml(dev.title)}</span>
      </div>
      <div class="sl-card-fit">${escapeHtml(dev.fitInFello || '')}</div>
      ${dev.whichTeam ? `<span class="sl-team-badge">${escapeHtml(dev.whichTeam)}</span>` : ''}
      <div class="sl-ideas-list" style="display:none;">
        ${ideasHtml ? `<div class="sl-ideas-label">Immediate ideas</div>${ideasHtml}` : ''}
      </div>
    `;

    card.addEventListener('click', () => {
      const ideasEl = card.querySelector('.sl-ideas-list');
      const expanded = card.dataset.expanded === 'true';
      card.dataset.expanded = expanded ? 'false' : 'true';
      ideasEl.style.display = expanded ? 'none' : 'block';
    });

    area.appendChild(card);
  });
}

function formatScore(score) {
  if (score == null) return '—';
  return parseFloat(score).toFixed(1);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Chat ──────────────────────────────────────────────────────────────────

async function sendChat(overlay, text, cfg) {
  const input = overlay.querySelector('#scryon-lens-input');
  const sendBtn = overlay.querySelector('#sl-send-btn');
  const messagesEl = overlay.querySelector('#sl-messages');

  input.value = '';
  sendBtn.disabled = true;

  // Clear welcome text on first message
  const welcome = messagesEl.querySelector('.sl-msg-welcome');
  if (welcome) welcome.remove();

  // Add user message
  appendMessage(messagesEl, text, 'user');
  conversationHistory.push({ role: 'user', text });

  // Show typing indicator
  const typing = document.createElement('div');
  typing.className = 'sl-typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  messagesEl.appendChild(typing);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const baseUrl = (cfg.scryon_url || '').replace(/\/$/, '');
    const historyToSend = conversationHistory.slice(-10).slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      text: m.text,
    }));

    const res = await fetch(baseUrl + '/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.scryon_token,
      },
      body: JSON.stringify({ message: text, conversationHistory: historyToSend }),
    });

    const json = await res.json();
    typing.remove();

    const reply = (json.data && json.data.response) ? json.data.response : 'Sorry, something went wrong.';
    appendMessage(messagesEl, reply, 'bot');
    conversationHistory.push({ role: 'assistant', text: reply });

    // Trim history to last 10
    if (conversationHistory.length > 10) conversationHistory = conversationHistory.slice(-10);
  } catch (_err) {
    typing.remove();
    appendMessage(messagesEl, 'Could not reach Scryon. Check your connection.', 'bot');
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
  input.focus();
}

function appendMessage(container, text, role) {
  const div = document.createElement('div');
  div.className = role === 'user' ? 'sl-msg sl-msg-user' : 'sl-msg sl-msg-bot';
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
