const urlInput = document.getElementById('scryon-url');
const tokenInput = document.getElementById('scryon-token');
const saveBtn = document.getElementById('save-btn');
const msgEl = document.getElementById('msg');
const statusDot = document.getElementById('status-dot');
const statusLabel = document.getElementById('status-label');
const togglePw = document.getElementById('toggle-pw');

// Load saved values
chrome.storage.sync.get(['scryon_url', 'scryon_token'], (cfg) => {
  if (cfg.scryon_url) urlInput.value = cfg.scryon_url;
  if (cfg.scryon_token) tokenInput.value = cfg.scryon_token;
  if (cfg.scryon_url && cfg.scryon_token) {
    checkConnection(cfg.scryon_url, cfg.scryon_token);
  } else {
    setStatus('not-configured', 'Not configured');
  }
});

// Toggle password visibility
togglePw.addEventListener('click', () => {
  const isPassword = tokenInput.type === 'password';
  tokenInput.type = isPassword ? 'text' : 'password';
  togglePw.textContent = isPassword ? 'hide' : 'show';
});

// Save
saveBtn.addEventListener('click', () => {
  const url = urlInput.value.trim().replace(/\/$/, '');
  const token = tokenInput.value.trim();

  if (!url) { showMsg('Enter your Scryon URL', true); return; }
  if (!token) { showMsg('Enter your API token', true); return; }

  chrome.storage.sync.set({ scryon_url: url, scryon_token: token }, () => {
    showMsg('Saved!');
    checkConnection(url, token);
  });
});

function checkConnection(url, token) {
  setStatus('checking', 'Checking…');
  fetch(url.replace(/\/$/, '') + '/api/extension/summary', {
    headers: { 'Authorization': 'Bearer ' + token },
  })
    .then((res) => {
      if (res.ok) {
        setStatus('connected', 'Connected');
      } else {
        setStatus('error', 'Auth failed (' + res.status + ')');
      }
    })
    .catch(() => setStatus('error', 'Unreachable'));
}

function setStatus(type, label) {
  statusLabel.textContent = label;
  statusDot.className = 'status-dot';
  if (type === 'connected') statusDot.classList.add('connected');
  if (type === 'error') statusDot.classList.add('error');
}

function showMsg(text, isError) {
  msgEl.textContent = text;
  msgEl.style.color = isError ? '#EF4444' : '#22C55E';
  setTimeout(() => { msgEl.textContent = ''; }, 2500);
}
