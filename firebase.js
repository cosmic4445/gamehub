import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, collection, addDoc, getDocs,
  query, orderBy, limit, doc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js';

// ── Config ────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBILIPIC_e46Joy3yxI-a4dci6Sk7ReVWk",
  authDomain:        "gamehub-69e6e.firebaseapp.com",
  projectId:         "gamehub-69e6e",
  storageBucket:     "gamehub-69e6e.firebasestorage.app",
  messagingSenderId: "1041656078700",
  appId:             "1:1041656078700:web:e44f89f86cda90e1191349",
  measurementId:     "G-3PYZW83N4E"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
try { getAnalytics(app); } catch (e) {}

// expose for app.js
window._auth = auth;
window._db   = db;

const fbS = document.getElementById('fb-s');
if (fbS) { fbS.textContent = '✓ connected · gamehub-69e6e'; fbS.style.color = '#4f4'; }

// ── Auth state ────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (user) { window._fbUser = user; onLogin(user); }
  else      { window._fbUser = null; onLogout(); }
});

function onLogin(user) {
  const name = user.displayName || user.email.split('@')[0];
  window._userName = name;
  document.getElementById('ubadge').textContent = name;
  document.getElementById('ubadge').style.display = '';
  document.getElementById('btnli').style.display = 'none';
  document.getElementById('btnreg').style.display = 'none';
  document.getElementById('sacct').textContent = 'Signed in as ' + name;
  document.getElementById('slogout').style.display = '';
  renderProfile(user);
  nav('games');
}

function onLogout() {
  window._userName = null;
  document.getElementById('ubadge').style.display = 'none';
  document.getElementById('btnli').style.display = '';
  document.getElementById('btnreg').style.display = '';
  document.getElementById('sacct').textContent = 'Not logged in';
  document.getElementById('slogout').style.display = 'none';
}

// ── Auth actions ──────────────────────────────────────
window.doLogin = async () => {
  const email = document.getElementById('lie').value.trim();
  const pass  = document.getElementById('lip').value;
  const err   = document.getElementById('lerr');
  if (!email || !pass) { err.textContent = 'Fill all fields.'; return; }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    err.textContent = '';
  } catch (e) { err.textContent = friendlyErr(e); }
};

window.doReg = async () => {
  const u     = document.getElementById('ruu').value.trim();
  const email = document.getElementById('rue').value.trim();
  const pass  = document.getElementById('rup').value;
  const pass2 = document.getElementById('rup2').value;
  const err   = document.getElementById('rerr');
  const ok    = document.getElementById('rok');
  err.textContent = ''; ok.textContent = '';
  if (!u || !email || !pass || !pass2) { err.textContent = 'Fill all fields.'; return; }
  if (pass.length < 6)  { err.textContent = 'Password min 6 chars.'; return; }
  if (pass !== pass2)   { err.textContent = 'Passwords do not match.'; return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: u });
    await setDoc(doc(db, 'users', cred.user.uid), { username: u, email, createdAt: serverTimestamp() });
    ok.textContent = 'Account created! Logging you in...';
  } catch (e) { err.textContent = friendlyErr(e); }
};

window.doLogout = async () => { await signOut(auth); nav('games'); };

window.doForgot = async () => {
  const email = document.getElementById('lie').value.trim();
  const err   = document.getElementById('lerr');
  if (!email) { err.textContent = 'Enter your email first.'; return; }
  try {
    await sendPasswordResetEmail(auth, email);
    err.style.color = '#4f4';
    err.textContent = 'Reset email sent!';
  } catch (e) { err.textContent = friendlyErr(e); }
};

function friendlyErr(e) {
  const m = e.message || '';
  if (m.includes('user-not-found') || m.includes('wrong-password') || m.includes('invalid-credential'))
    return 'Wrong email or password.';
  if (m.includes('email-already-in-use')) return 'Email already registered.';
  if (m.includes('weak-password'))        return 'Password too weak.';
  if (m.includes('invalid-email'))        return 'Invalid email address.';
  return m;
}

// ── Profile ───────────────────────────────────────────
async function renderProfile(user) {
  const name = user.displayName || user.email.split('@')[0];
  let myScores = [];
  try {
    const q    = query(collection(db, 'scores'), orderBy('score', 'desc'), limit(200));
    const snap = await getDocs(q);
    myScores   = snap.docs.map(d => d.data()).filter(d => d.userId === user.uid);
  } catch (e) {}
  const best = myScores.length ? Math.max(...myScores.map(s => s.score)) : 0;
  document.getElementById('prof-inner').innerHTML = `
    <div class="prof-stat"><span class="prof-label">username</span><span class="prof-val">${name}</span></div>
    <div class="prof-stat"><span class="prof-label">email</span><span class="prof-val" style="font-size:10px">${user.email}</span></div>
    <div class="prof-stat"><span class="prof-label">games played</span><span class="prof-val">${myScores.length}</span></div>
    <div class="prof-stat"><span class="prof-label">best score</span><span class="prof-val">${best ? best.toLocaleString() : '—'}</span></div>
    <div style="margin-top:14px"><button class="dbtn" onclick="doLogout()">Log Out</button></div>
  `;
}

// ── Score saving ──────────────────────────────────────
window.addScore = async (game, score) => {
  if (!window._fbUser || !score) return;
  const name = window._fbUser.displayName || window._fbUser.email.split('@')[0];
  try {
    await addDoc(collection(db, 'scores'), {
      userId:   window._fbUser.uid,
      username: name,
      game,
      score:    Math.round(score),
      ts:       serverTimestamp()
    });
  } catch (e) { console.warn('Score save failed:', e.message); }
};

// ── Leaderboard ───────────────────────────────────────
window.renderLB = async () => {
  const tbody = document.getElementById('lbbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="lb-empty">loading...</td></tr>';
  try {
    const q    = query(collection(db, 'scores'), orderBy('score', 'desc'), limit(30));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => d.data());
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="lb-empty">no scores yet — play a game!</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((r, i) => {
      const date = r.ts ? new Date(r.ts.seconds * 1000).toLocaleDateString('en-CA') : '—';
      return `<tr>
        <td style="color:#2a2a2a">${i + 1}</td>
        <td style="color:#aaa">${r.username || '?'}</td>
        <td style="font-size:8px;letter-spacing:2px;color:#333">${r.game}</td>
        <td>${(r.score || 0).toLocaleString()}</td>
        <td style="font-size:8px;color:#2a2a2a">${date}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#c00;font-size:9px;padding:12px 10px">error: ${e.message}</td></tr>`;
  }
};

// ── Search ────────────────────────────────────────────
window.doSearch = async () => {
  const q   = document.getElementById('sq').value.trim();
  const out = document.getElementById('srout');
  if (!q) return;
  out.innerHTML = '<span class="sr-placeholder">searching...</span>';
  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        model:   'claude-sonnet-4-20250514',
        max_tokens: 800,
        system:  'Return 5 search results as JSON array: [{title,url,snippet}]. Raw JSON only, no markdown.',
        messages: [{ role: 'user', content: q }]
      })
    });
    const d  = await res.json();
    const rs = JSON.parse(d.content.map(i => i.text || '').join(''));
    out.innerHTML =
      `<div style="font-size:8px;color:#333;letter-spacing:3px;margin-bottom:10px">results for: ${q}</div>` +
      rs.map(r => `
        <div class="src">
          <div class="srt">${r.title}</div>
          <div class="sru">${r.url}</div>
          <div class="srs">${r.snippet}</div>
        </div>`).join('');
  } catch (e) {
    out.innerHTML = '<span style="font-size:9px;color:#c00">error — try again</span>';
  }
};

window.renderLB();