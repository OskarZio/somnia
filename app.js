/* Somnia – aplikacja do nauki świadomego śnienia.
   Wszystkie dane zostają lokalnie w przeglądarce (localStorage). */
'use strict';

/* ================= Narzędzia ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const DAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
const fmtTime = (d) => { d = new Date(d); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDate = (d) => { d = new Date(d); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const dayKey = (d) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
/* „Noc” liczymy od wieczora: wpis przed 15:00 należy do nocy, która zaczęła się poprzedniego dnia. */
const nightKey = (ts) => { const d = new Date(ts); if (d.getHours() < 15) d.setDate(d.getDate() - 1); return dayKey(d); };
const nightLabel = (k) => { const a = fromKey(k); const b = new Date(a); b.setDate(b.getDate() + 1); return `Noc ${a.getDate()}${a.getMonth() !== b.getMonth() ? ' ' + MONTHS[a.getMonth()] : ''} → ${b.getDate()} ${MONTHS[b.getMonth()]}`; };
const minsToHM = (m) => { m = Math.round(m); const h = Math.floor(m / 60); const r = m % 60; return h ? `${h} h${r ? ' ' + r + ' min' : ''}` : `${r} min`; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function download(name, text, type = 'application/json') {
  const blob = new Blob([text], { type }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
async function sha256(s) {
  if (!crypto.subtle) return s; // brak bezpiecznego kontekstu – awaryjnie
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/* ================= Stan ================= */
const KEY = 'somnia.v1';
const DEFAULT_SETTINGS = {
  cycle: 90, latency: 15, wbtb: true, wbtbCycles: 3, awakeMin: 10, technique: 'mild',
  tlr: true, tlrDelay: 20, cueSound: 'bowl', cueVol: 0.12, alarmVol: 0.6, alarmStyle: 'gentle',
  morning: '07:00', voice: true, voiceRate: 0.9, rcStart: '09:00', rcEnd: '22:00', rcPerDay: 8,
  inAppRc: false, pinHash: null,
};
let S = load();
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.dreams) { raw.settings = { ...DEFAULT_SETTINGS, ...raw.settings }; return { ...fresh(), ...raw }; }
  } catch (e) { console.warn(e); }
  return fresh();
}
function fresh() {
  return { dreams: [], signs: [], rc: [], nights: [], daily: {}, settings: { ...DEFAULT_SETTINGS }, programStart: dayKey(new Date()), session: null, created: Date.now() };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Nie udało się zapisać – pamięć przeglądarki pełna? Zrób eksport.'); }
}
const daily = (k = dayKey(new Date())) => (S.daily[k] ||= { tasks: {}, targets: [], intention: '' });

/* ================= Modal ================= */
function openModal(html, onMount) {
  $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden'; onMount && onMount($('#modalBox'));
}
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; document.body.style.overflow = ''; stopDictation(); }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

/* ================= Router ================= */
let TAB = 'journal';
const VIEWS = {};
function go(tab) {
  TAB = tab; $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  render(); window.scrollTo(0, 0);
}
function render() { $('#view').innerHTML = VIEWS[TAB](); bindView(); }
$$('.tabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));

/* ================= DZIENNIK ================= */
let jFilter = 'all', jQuery = '';
VIEWS.journal = () => {
  const today = nightKey(Date.now());
  const lastNightLogged = S.dreams.some((d) => d.night === today) || S.nights.some((n) => n.night === today && n.noRecall);
  let list = S.dreams.slice().sort((a, b) => b.ts - a.ts);
  if (jFilter === 'lucid') list = list.filter((d) => d.lucidity >= 2);
  if (jFilter === 'night') list = list.filter((d) => d.nightmare);
  if (jFilter === 'signs') list = list.filter((d) => d.signs?.length);
  if (jQuery) { const q = jQuery.toLowerCase(); list = list.filter((d) => (d.title + ' ' + d.text + ' ' + (d.tags || []).join(' ')).toLowerCase().includes(q)); }
  const groups = {};
  list.forEach((d) => (groups[d.night] ||= []).push(d));
  const wk = currentWeek();
  return `
  ${new Date().getHours() >= 18 ? `<div class="card glow">
    <h2>Dobry wieczór ☾</h2>
    <p class="muted small">Przeczytaj 1–2 ostatnie sny, przypomnij sobie znaki snu i ustaw intencję: „Dziś w nocy zauważę, że śnię”.</p>
    <div class="row"><button class="btn primary" data-act="go-night">Zaplanuj noc</button><button class="btn ghost" data-act="new-dream">+ Zapisz sen</button></div>
  </div>` : !lastNightLogged && new Date().getHours() < 15 ? `<div class="card glow">
    <h2>Dzień dobry ☀</h2>
    <p class="muted">Zanim cokolwiek zrobisz: nie ruszaj się, odtwórz sen od końca. Potem zapisz – choćby jedno słowo.</p>
    <div class="row"><button class="btn primary" data-act="new-dream">+ Zapisz sen</button><button class="btn ghost" data-act="no-recall">Nic nie pamiętam</button></div>
  </div>` : `<div class="row between" style="margin-top:8px"><button class="btn primary" data-act="new-dream">+ Nowy sen</button><span class="small muted">Tydzień ${wk.week}: ${esc(wk.title)}</span></div>`}
  <div class="card" style="padding:12px">
    <input type="search" id="jSearch" placeholder="Szukaj w snach, tagach…" value="${esc(jQuery)}">
    <div class="chips" style="margin-top:10px">
      ${[['all', 'Wszystkie'], ['lucid', 'Świadome'], ['signs', 'Ze znakami snu'], ['night', 'Koszmary']].map(([k, l]) => `<button class="chip ${jFilter === k ? 'on' : ''}" data-filter="${k}">${l}</button>`).join('')}
    </div>
  </div>
  ${list.length ? Object.keys(groups).map((k) => `<div class="night-group">${nightLabel(k)}</div>${groups[k].map(dreamCard).join('')}`).join('') :
    `<div class="empty"><div class="big">☁</div>${S.dreams.length ? 'Brak snów dla tego filtra.' : 'Twój dziennik jest pusty. Pierwszy zapisany sen – nawet fragment – to pierwszy krok do świadomego śnienia.'}</div>`}
  `;
};
function dreamCard(d) {
  const signs = (d.signs || []).map((id) => S.signs.find((s) => s.id === id)).filter(Boolean);
  return `<div class="card dream ${d.lucidity >= 2 ? 'is-lucid' : ''}" data-open="${d.id}">
    <div class="row between"><div class="title">${esc(d.title || 'Bez tytułu')}</div><div class="meta">${fmtTime(d.ts)}</div></div>
    <div class="excerpt">${esc(d.text || (d.fragment ? 'Fragment' : ''))}</div>
    <div style="margin-top:6px">
      ${d.lucidity >= 1 ? `<span class="tag lucid">✦ ${LUCIDITY_LEVELS[d.lucidity].label}</span>` : ''}
      ${d.nightmare ? '<span class="tag night">koszmar</span>' : ''}
      ${d.falseAwake ? '<span class="tag">fałszywe przebudzenie</span>' : ''}
      ${d.technique && d.technique !== 'none' ? `<span class="tag">${esc(techName(d.technique))}</span>` : ''}
      ${signs.map((s) => `<span class="tag sign">◆ ${esc(s.name)}</span>`).join('')}
      ${(d.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}
    </div>
  </div>`;
}
const TECH_OPTS = [['none', 'Brak'], ['mild', 'WBTB + MILD'], ['ssild', 'WBTB + SSILD'], ['wbtb', 'Sam WBTB'], ['tlr', 'Cue dźwiękowe (TLR)'], ['rc', 'Tylko reality checki'], ['wild', 'WILD / DEILD / FILD'], ['other', 'Inna']];
const techName = (id) => (TECH_OPTS.find((t) => t[0] === id) || [, id])[1];

function guessTechnique() {
  const sess = S.session;
  if (sess && nightKey(sess.start) === nightKey(Date.now())) {
    if (sess.plan.wbtb && sess.plan.technique === 'mild') return 'mild';
    if (sess.plan.wbtb && sess.plan.technique === 'ssild') return 'ssild';
    if (sess.plan.wbtb) return 'wbtb';
    if (sess.plan.tlr) return 'tlr';
  }
  const n = S.nights.find((x) => x.night === nightKey(Date.now()));
  return n?.technique || 'none';
}

function dreamEditor(d) {
  const isNew = !d;
  d = d || { id: uid(), ts: Date.now(), title: '', text: '', lucidity: 0, vivid: 3, emotions: [], tags: [], signs: [], technique: guessTechnique(), nightmare: false, falseAwake: false, fragment: false };
  const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  openModal(`
    <div class="row between"><h2>${isNew ? 'Nowy sen' : 'Edytuj sen'}</h2><button class="btn ghost sm" data-close>✕</button></div>
    <label>Tytuł (opcjonalnie)</label>
    <input type="text" id="dTitle" value="${esc(d.title)}" placeholder="np. Latający autobus">
    <div class="row between"><label>Opis snu</label>${hasSR ? `<button class="btn sm" id="dMic">🎙 Dyktuj</button>` : '<span class="small dim">Dyktowanie: użyj mikrofonu na klawiaturze</span>'}</div>
    <textarea id="dText" placeholder="Zacznij od ostatniej sceny i idź wstecz. Słowa-klucze wystarczą.">${esc(d.text)}</textarea>
    <label>Świadomość</label>
    <div class="seg" id="dLuc">${LUCIDITY_LEVELS.map((l) => `<button data-v="${l.v}" class="${d.lucidity === l.v ? 'on' : ''}" title="${l.desc}">${l.label}</button>`).join('')}</div>
    <label>Wyrazistość: <b id="dVivV">${d.vivid}</b>/5</label>
    <input type="range" min="1" max="5" id="dVivid" value="${d.vivid}">
    <label>Emocje</label>
    <div class="chips" id="dEmo">${EMOTIONS.map((e) => `<button class="chip ${d.emotions.includes(e) ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
    <label>Znaki snu <span class="dim">(rzeczy, które powtarzają się w Twoich snach)</span></label>
    <div class="chips" id="dSigns">${S.signs.map((s) => `<button class="chip ${d.signs.includes(s.id) ? 'on' : ''}" data-s="${s.id}">◆ ${esc(s.name)}</button>`).join('')}<button class="chip" id="dAddSign">+ nowy znak</button></div>
    <label>Tagi (po przecinku)</label>
    <input type="text" id="dTags" value="${esc((d.tags || []).join(', '))}" placeholder="dom, rodzina, woda">
    <div class="grid2">
      <div><label>Technika tej nocy</label><select id="dTech">${TECH_OPTS.map(([k, l]) => `<option value="${k}" ${d.technique === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label>Godzina</label><input type="time" id="dTime" value="${fmtTime(d.ts)}"></div>
    </div>
    <label class="switch">Koszmar <input type="checkbox" id="dNight" ${d.nightmare ? 'checked' : ''}></label>
    <label class="switch">Fałszywe przebudzenie <input type="checkbox" id="dFA" ${d.falseAwake ? 'checked' : ''}></label>
    <label class="switch">Tylko fragment <input type="checkbox" id="dFrag" ${d.fragment ? 'checked' : ''}></label>
    <div class="row" style="margin-top:14px"><button class="btn primary big" style="flex:1" id="dSave">Zapisz</button></div>
  `, (box) => {
    $('[data-close]', box).onclick = closeModal;
    let lucidity = d.lucidity;
    $$('#dLuc button', box).forEach((b) => b.onclick = () => { lucidity = +b.dataset.v; $$('#dLuc button', box).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#dVivid', box).oninput = (e) => $('#dVivV', box).textContent = e.target.value;
    $$('#dEmo .chip', box).forEach((b) => b.onclick = () => b.classList.toggle('on'));
    const bindSigns = () => $$('#dSigns [data-s]', box).forEach((b) => b.onclick = () => b.classList.toggle('on'));
    bindSigns();
    $('#dAddSign', box).onclick = () => {
      const name = prompt('Nazwa znaku snu (np. „latanie”, „stara szkoła”, „zęby wypadają”):');
      if (!name?.trim()) return;
      const s = { id: uid(), name: name.trim(), cat: 'action', created: Date.now() }; S.signs.push(s); save();
      $('#dAddSign', box).insertAdjacentHTML('beforebegin', `<button class="chip on" data-s="${s.id}">◆ ${esc(s.name)}</button>`); bindSigns();
    };
    if ($('#dMic', box)) $('#dMic', box).onclick = () => toggleDictation($('#dText', box), $('#dMic', box));
    $('#dSave', box).onclick = () => {
      const [h, m] = $('#dTime', box).value.split(':').map(Number);
      const t = new Date(d.ts); if (!isNaN(h)) { t.setHours(h, m || 0, 0, 0); if (t.getTime() > Date.now() + 60000) t.setDate(t.getDate() - 1); }
      Object.assign(d, {
        ts: t.getTime(), title: $('#dTitle', box).value.trim(), text: $('#dText', box).value.trim(), lucidity,
        vivid: +$('#dVivid', box).value, emotions: $$('#dEmo .on', box).map((b) => b.dataset.e),
        signs: $$('#dSigns .on[data-s]', box).map((b) => b.dataset.s),
        tags: $('#dTags', box).value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
        technique: $('#dTech', box).value, nightmare: $('#dNight', box).checked, falseAwake: $('#dFA', box).checked, fragment: $('#dFrag', box).checked,
      });
      if (!d.text && !d.title) { toast('Wpisz choć jedno słowo 🙂'); return; }
      d.night = nightKey(d.ts);
      if (isNew) S.dreams.push(d);
      save(); closeModal(); render();
      toast(d.lucidity >= 2 ? '✦ Świadomy sen zapisany! Brawo!' : 'Sen zapisany');
    };
  });
}
function dreamView(id) {
  const d = S.dreams.find((x) => x.id === id); if (!d) return;
  const signs = (d.signs || []).map((sid) => S.signs.find((s) => s.id === sid)).filter(Boolean);
  openModal(`
    <div class="row between"><span class="small muted">${nightLabel(d.night)} · ${fmtTime(d.ts)}</span><button class="btn ghost sm" data-close>✕</button></div>
    <h1>${esc(d.title || 'Bez tytułu')}</h1>
    <div>${d.lucidity >= 1 ? `<span class="tag lucid">✦ ${LUCIDITY_LEVELS[d.lucidity].label}</span>` : ''}<span class="tag">wyrazistość ${d.vivid}/5</span>${d.nightmare ? '<span class="tag night">koszmar</span>' : ''}${d.technique && d.technique !== 'none' ? `<span class="tag">${esc(techName(d.technique))}</span>` : ''}</div>
    <p style="white-space:pre-wrap;margin-top:12px">${esc(d.text)}</p>
    ${d.emotions?.length ? `<p class="small muted">Emocje: ${d.emotions.map(esc).join(', ')}</p>` : ''}
    ${signs.length ? `<p>${signs.map((s) => `<span class="tag sign">◆ ${esc(s.name)}</span>`).join('')}</p>` : ''}
    ${(d.tags || []).length ? `<p>${d.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</p>` : ''}
    <hr><div class="row"><button class="btn" id="vEdit">Edytuj</button><button class="btn danger" id="vDel">Usuń</button></div>
  `, (box) => {
    $('[data-close]', box).onclick = closeModal;
    $('#vEdit', box).onclick = () => dreamEditor(d);
    $('#vDel', box).onclick = () => { if (confirm('Usunąć ten sen?')) { S.dreams = S.dreams.filter((x) => x.id !== id); save(); closeModal(); render(); } };
  });
}
function noRecall() {
  const k = nightKey(Date.now());
  let n = S.nights.find((x) => x.night === k);
  if (!n) { n = { id: uid(), night: k, technique: guessTechnique() }; S.nights.push(n); }
  n.noRecall = true; save(); render();
  toast('Zapisane. Jutro: intencja przed snem „zapamiętam sny” i 1 min bez ruchu po przebudzeniu.', 4000);
}

/* Dyktowanie (Web Speech API, pl-PL) */
let recog = null;
function toggleDictation(ta, btn) {
  if (recog) { stopDictation(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recog = new SR(); recog.lang = 'pl-PL'; recog.continuous = true; recog.interimResults = true;
  const base = ta.value ? ta.value.replace(/\s*$/, ' ') : '';
  let finalText = '';
  recog.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]; if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript;
    }
    ta.value = base + finalText + interim;
  };
  recog.onerror = (e) => { toast('Dyktowanie: ' + (e.error === 'not-allowed' ? 'brak dostępu do mikrofonu' : e.error)); };
  recog.onend = () => { recog = null; btn.innerHTML = '🎙 Dyktuj'; };
  recog.start(); btn.innerHTML = '<span class="rec">●</span> Stop';
}
function stopDictation() { try { recog && recog.stop(); } catch (e) {} recog = null; }

/* ================= AUDIO ================= */
const Sound = {
  ctx: null, keep: null,
  ensure() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  /* Bardzo cichy szum w pętli – pomaga utrzymać kontekst audio przy włączonym ekranie nocnym */
  keepAlive(on) {
    const c = this.ensure(); if (!c) return;
    if (on && !this.keep) {
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.0008;
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(c.destination); src.start(); this.keep = src;
    } else if (!on && this.keep) { try { this.keep.stop(); } catch (e) {} this.keep = null; }
  },
  tone(freq, t0, dur, gain, type = 'sine', dest) {
    const c = this.ctx; const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  bell(freq, t0, dur, gain, dest) {
    [[1, 1], [2.01, 0.35], [2.76, 0.22], [5.4, 0.08]].forEach(([r, a]) => this.tone(freq * r, t0, dur / (r > 2 ? 1.6 : 1), gain * a, 'sine', dest));
  },
  /* Dźwięki cue – miękkie, bez ostrych ataków */
  cue(kind = S.settings.cueSound, vol = S.settings.cueVol) {
    const c = this.ensure(); if (!c) return 0; const t = c.currentTime + 0.05;
    if (kind === 'bowl') { this.bell(220, t, 7, vol); this.bell(330.5, t + 0.01, 6, vol * 0.4); return 7; }
    if (kind === 'bells') { [523.25, 659.25, 783.99, 659.25].forEach((f, i) => this.bell(f, t + i * 0.7, 3, vol * 0.8)); return 5; }
    if (kind === 'pulse') { for (let i = 0; i < 3; i++) this.tone(440, t + i * 0.9, 0.5, vol, 'triangle'); return 3; }
    if (kind === 'chord') { [261.63, 329.63, 392, 493.88].forEach((f) => this.tone(f, t, 5, vol * 0.5, 'sine')); return 5; }
    return 0;
  },
  alarmTimer: null,
  startAlarm(style = S.settings.alarmStyle, maxVol = S.settings.alarmVol) {
    const c = this.ensure(); if (!c) return; this.stopAlarm();
    const started = Date.now(); const soft = style === 'deild';
    const ring = () => {
      const el = (Date.now() - started) / 1000;
      const ramp = soft ? 0.25 : clamp(0.08 + el / 75, 0.08, 1); // narasta przez ~75 s
      const v = maxVol * ramp * (soft ? 0.5 : 1); const t = c.currentTime + 0.05;
      const notes = soft ? [392, 523.25] : [392, 493.88, 587.33, 783.99];
      notes.forEach((f, i) => this.bell(f, t + i * 0.45, 3.2, v));
      if (navigator.vibrate && !soft && el > 20) navigator.vibrate([300, 200, 300]);
    };
    ring(); this.alarmTimer = setInterval(ring, soft ? 6000 : 3600);
  },
  stopAlarm() { clearInterval(this.alarmTimer); this.alarmTimer = null; navigator.vibrate && navigator.vibrate(0); },
};

/* Synteza mowy */
let plVoice = null;
function loadVoices() { const v = speechSynthesis.getVoices(); plVoice = v.find((x) => /pl[-_]PL/i.test(x.lang)) || v.find((x) => /^pl/i.test(x.lang)) || null; }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(text) {
  return new Promise((res) => {
    if (!S.settings.voice || !('speechSynthesis' in window)) return res();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'pl-PL'; if (plVoice) u.voice = plVoice;
    u.rate = S.settings.voiceRate; u.pitch = 0.95; u.volume = 0.8;
    const done = () => { clearTimeout(guard); res(); };
    const guard = setTimeout(res, 2000 + text.length * 120);
    u.onend = done; u.onerror = done; speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
}

/* Wake Lock – ekran nie gaśnie w trakcie nocy */
let wakeLock = null;
async function lockScreen(on) {
  try {
    if (on && 'wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); }
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { console.warn('wakeLock', e); }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.session && !wakeLock) lockScreen(true); });

/* ================= PLAN NOCY ================= */
function computePlan(startTs, st = S.settings) {
  const C = st.cycle, L = st.latency;
  const sleepOnset = startTs + L * 60000;
  const plan = { start: startTs, sleepOnset, cycle: C, latency: L, wbtb: !!st.wbtb, technique: st.technique, tlr: !!st.tlr, tlrDelay: st.tlrDelay, awakeMin: st.awakeMin, alarmStyle: st.alarmStyle };
  // Poranna pobudka: koniec cyklu najbliższy wybranej godzinie
  const [mh, mm] = st.morning.split(':').map(Number);
  const target = new Date(startTs); target.setHours(mh, mm, 0, 0); if (target.getTime() <= startTs + 3 * 3600000) target.setDate(target.getDate() + 1);
  let extra = 0;
  if (plan.wbtb) {
    plan.wbtbAt = sleepOnset + st.wbtbCycles * C * 60000;
    // po WBTB: czuwanie + technika (~10 min) + zasypianie
    extra = (st.awakeMin + 10 + L) * 60000;
    plan.returnAt = plan.wbtbAt + extra; // szacunkowo
  }
  const base = plan.wbtb ? plan.returnAt : sleepOnset;
  const offsetStart = plan.wbtb ? plan.wbtbAt : sleepOnset;
  const cyclesDone = plan.wbtb ? st.wbtbCycles : 0;
  let n = Math.max(1, Math.round((target - base) / (C * 60000)));
  let morning = base + n * C * 60000;
  if (Math.abs(morning - target) > 50 * 60000) morning = target.getTime(); // nie da się dopasować – użyj dokładnej godziny
  plan.morningAt = morning; plan.targetMorning = target.getTime();
  plan.totalSleepMin = Math.round((morning - sleepOnset - extra) / 60000);
  plan.cycles = cyclesDone + n;
  // Okna cue TLR (szacowane okresy REM w późnych cyklach)
  plan.cueWindows = [];
  if (plan.tlr) {
    if (plan.wbtb) {
      const s = plan.returnAt + st.tlrDelay * 60000;
      plan.cueWindows.push([s, Math.min(s + 45 * 60000, morning - 10 * 60000)]);
      for (let t = s + C * 60000 * 0.75; t < morning - 25 * 60000; t += C * 60000) plan.cueWindows.push([t, Math.min(t + 25 * 60000, morning - 10 * 60000)]);
    } else {
      for (let k = 3; k < plan.cycles; k++) {
        const end = sleepOnset + (k + 1) * C * 60000; const s = end - 30 * 60000;
        if (s > sleepOnset + 4.5 * 3600000 && s < morning - 15 * 60000) plan.cueWindows.push([s, Math.min(end, morning - 10 * 60000)]);
      }
    }
    plan.cueWindows = plan.cueWindows.filter(([a, b]) => b - a > 5 * 60000);
  }
  return plan;
}
function timelineHTML(p) {
  const t0 = p.start, t1 = p.morningAt, span = t1 - t0; const x = (t) => clamp(((t - t0) / span) * 100, 0, 100);
  let cyc = ''; const C = p.cycle * 60000;
  for (let t = p.sleepOnset, i = 0; t < t1; t += C, i++) {
    const w = Math.min(C, t1 - t) / span * 100;
    const remShare = clamp(0.1 + i * 0.07, 0.1, 0.45); // REM wydłuża się nad ranem
    cyc += `<div class="cyc" style="left:${x(t)}%;width:${w}%;background:linear-gradient(90deg,#1f2a5c ${100 - remShare * 100}%, #6d4bd6 ${100 - remShare * 100}%)"></div>`;
  }
  const cues = p.cueWindows.map(([a, b]) => `<div class="cyc" style="left:${x(a)}%;width:${x(b) - x(a)}%;top:auto;height:3px;bottom:-6px;background:#22d3ee"></div>`).join('');
  return `<div class="timeline">
    <div class="bar">${cyc}</div><div class="bar" style="background:none;overflow:visible">${cues}</div>
    <div class="mark" style="left:0;transform:none">${fmtTime(p.start)}</div>
    ${p.wbtb ? `<div class="pin" style="left:${x(p.wbtbAt)}%;background:var(--gold)"></div><div class="mark" style="left:${x(p.wbtbAt)}%;top:32px">WBTB ${fmtTime(p.wbtbAt)}</div>` : ''}
    <div class="mark" style="right:0;left:auto;transform:none">${fmtTime(p.morningAt)}</div>
  </div>
  <div class="legend" style="margin-top:18px"><span><i style="background:#1f2a5c"></i>sen NREM</span><span><i style="background:#6d4bd6"></i>REM (szac.)</span>${p.wbtb ? '<span><i style="background:var(--gold)"></i>pobudka WBTB</span>' : ''}${p.tlr ? '<span><i style="background:#22d3ee"></i>cue dźwiękowe</span>' : ''}</div>`;
}

VIEWS.night = () => {
  const st = S.settings; const p = computePlan(Date.now());
  const nightsWbtbWeek = S.nights.filter((n) => n.wbtbDone && Date.now() - fromKey(n.night).getTime() < 7 * 864e5).length;
  return `
  <div class="card glow hero">
    <div class="small muted">Jeśli kładziesz się teraz (${fmtTime(Date.now())})</div>
    <div class="clock">${fmtTime(p.morningAt)}</div>
    <div class="muted">pobudka po ${p.cycles} cyklach · ok. ${minsToHM(p.totalSleepMin)} snu</div>
    ${p.wbtb ? `<p style="margin-top:10px">☾ WBTB o <b>${fmtTime(p.wbtbAt)}</b> → ${p.technique === 'ssild' ? 'SSILD' : p.technique === 'mild' ? 'MILD' : 'powrót do snu'}${p.tlr ? ' → cue dźwiękowe' : ''}</p>` : (p.tlr ? '<p style="margin-top:10px">Cue dźwiękowe w porannych okresach REM</p>' : '')}
    ${timelineHTML(p)}
    <button class="btn primary big block" style="margin-top:18px" data-act="start-night">Zaczynam noc</button>
    <p class="small dim" style="margin-top:8px">Zostaw aplikację otwartą, telefon na ładowarce, ekran przygaszony (Somnia pokaże ciemnoczerwony ekran). Ustaw też zapasowy budzik systemowy.</p>
  </div>
  ${nightsWbtbWeek >= 3 && st.wbtb ? `<div class="card" style="border-color:#7c5e10"><b>⚠ ${nightsWbtbWeek} noce z WBTB w ostatnich 7 dniach.</b><p class="muted small">Daj sobie dziś normalną noc – wypoczęty mózg śni lepiej. Wyłącz WBTB poniżej.</p></div>` : ''}
  <div class="section-title"><h2>Ustawienia nocy</h2></div>
  <div class="card">
    <label class="switch"><span><b>Pobudka WBTB</b><br><span class="small muted">budzik w środku nocy + technika</span></span><input type="checkbox" data-set="wbtb" ${st.wbtb ? 'checked' : ''}></label>
    ${st.wbtb ? `
    <label>Kiedy WBTB</label>
    <div class="seg" data-seg="wbtbCycles">${[[3, 'po 3 cyklach (~4,5 h)'], [4, 'po 4 cyklach (~6 h)']].map(([v, l]) => `<button data-v="${v}" class="${st.wbtbCycles === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <label>Technika po pobudce</label>
    <div class="seg" data-seg="technique">${[['mild', 'MILD'], ['ssild', 'SSILD'], ['none', 'Bez prowadzenia']].map(([v, l]) => `<button data-v="${v}" class="${st.technique === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <label>Czuwanie przed techniką: <b>${st.awakeMin} min</b></label>
    <input type="range" min="0" max="45" step="5" data-range="awakeMin" value="${st.awakeMin}">
    <p class="small dim">Krócej = łatwiej zasnąć (ważne dla MILD/SSILD). Dłużej = większa czujność. Zacznij od 5–15 min.</p>` : ''}
    <hr>
    <label class="switch"><span><b>Cue dźwiękowe (TLR)</b><br><span class="small muted">trening z dźwiękiem + ciche cue w REM</span></span><input type="checkbox" data-set="tlr" ${st.tlr ? 'checked' : ''}></label>
    ${st.tlr ? `<label>Dźwięk cue</label>
    <div class="seg" data-seg="cueSound">${[['bowl', 'Misa'], ['bells', 'Dzwonki'], ['chord', 'Akord'], ['pulse', 'Puls']].map(([v, l]) => `<button data-v="${v}" class="${st.cueSound === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <label>Głośność cue: <b>${Math.round(st.cueVol * 100)}%</b> <span class="dim">– ledwo słyszalne na jawie</span></label>
    <input type="range" min="0.02" max="0.5" step="0.01" data-range="cueVol" value="${st.cueVol}">
    ${st.wbtb ? `<label>Opóźnienie cue po powrocie do łóżka: <b>${st.tlrDelay} min</b></label><input type="range" min="10" max="60" step="5" data-range="tlrDelay" value="${st.tlrDelay}">` : ''}
    <button class="btn sm" data-act="test-cue">▶ Odsłuchaj cue</button>` : ''}
    <hr>
    <div class="grid2">
      <div><label>Chcę wstać ok.</label><input type="time" data-input="morning" value="${st.morning}"></div>
      <div><label>Zasypiam w ok. (min)</label><input type="number" min="0" max="60" data-input="latency" value="${st.latency}"></div>
    </div>
    <label>Długość cyklu snu: <b>${st.cycle} min</b> <span class="dim">(typowo 80–110)</span></label>
    <input type="range" min="75" max="115" step="5" data-range="cycle" value="${st.cycle}">
    <label>Styl budzika</label>
    <div class="seg" data-seg="alarmStyle">${[['gentle', 'Narastający'], ['deild', 'Bardzo cichy (DEILD)']].map(([v, l]) => `<button data-v="${v}" class="${st.alarmStyle === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <label>Maks. głośność budzika: <b>${Math.round(st.alarmVol * 100)}%</b></label>
    <input type="range" min="0.1" max="1" step="0.05" data-range="alarmVol" value="${st.alarmVol}">
    <div class="row"><button class="btn sm" data-act="test-alarm">▶ Test budzika (5 s)</button>
    <button class="btn sm" data-act="test-voice">▶ Test głosu</button></div>
    <label class="switch" style="margin-top:8px">Prowadzenie głosem <input type="checkbox" data-set="voice" ${st.voice ? 'checked' : ''}></label>
  </div>
  <div class="card">
    <h3>Jak działa budzik Somnii</h3>
    <ul class="clean small muted">
      <li>Pobudki trafiają w <b>koniec cyklu snu</b> – budzisz się lżej i częściej prosto ze snu (lepsza pamięć).</li>
      <li>WBTB domyślnie po ~4,5–6 h: druga połowa nocy ma najdłuższe fazy REM.</li>
      <li>Po pobudce: ekran „nie ruszaj się – przypomnij sen”, szybka notatka, krótkie czuwanie, prowadzony MILD/SSILD i trening cue.</li>
      <li>Po powrocie do łóżka cue gra cicho seriami w szacowanych oknach REM (telefon nie mierzy faz snu – to estymacja).</li>
      <li>Rano: łagodny, narastający budzik albo bardzo cichy tryb DEILD.</li>
    </ul>
  </div>`;
};

/* --- Sesja nocna (maszyna stanów) --- */
let tick = null;
function startNight() {
  Sound.ensure(); Sound.keepAlive(true); lockScreen(true);
  if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } // odblokowanie TTS na iOS
  const plan = computePlan(Date.now());
  S.session = { id: uid(), start: Date.now(), plan, phase: 'sleep1', cuesPlayed: 0, nextCue: null, log: [] };
  save();
  if (plan.tlr && !plan.wbtb) { sessionGuide('presleep'); } else showNightScreen();
  runTick();
}
function runTick() { clearInterval(tick); tick = setInterval(nightTick, 1000); nightTick(); }
function nightTick() {
  const s = S.session; if (!s) { clearInterval(tick); return; }
  const now = Date.now(); const p = s.plan;
  if (s.phase === 'sleep1') {
    if (p.wbtb && now >= p.wbtbAt) { s.phase = 'alarm-wbtb'; save(); showAlarm('wbtb'); }
    else if (!p.wbtb && now >= p.morningAt) { s.phase = 'alarm-morning'; save(); showAlarm('morning'); }
    else maybeCue(now);
  } else if (s.phase === 'sleep2') {
    if (now >= p.morningAt) { s.phase = 'alarm-morning'; save(); showAlarm('morning'); }
    else maybeCue(now);
  } else if (s.phase === 'awake') {
    const left = Math.max(0, s.awakeUntil - now); const el = $('#awakeLeft'); if (el) el.textContent = `${Math.floor(left / 60000)}:${pad(Math.floor(left / 1000) % 60)}`;
    if (left <= 0 && !s.awakeAlerted) { s.awakeAlerted = true; Sound.cue(S.settings.cueSound, Math.max(0.15, S.settings.cueVol)); }
  }
  const nc = $('#nclock'); if (nc) nc.textContent = fmtTime(now);
}
function maybeCue(now) {
  const s = S.session; const w = s.plan.cueWindows.find(([a, b]) => now >= a && now < b);
  if (!w) return;
  if (!s.nextCue || s.nextCue < w[0] || s.nextCue > w[1]) s.nextCue = now + rand(20, 60) * 1000;
  if (now >= s.nextCue) {
    // delikatny narost głośności w obrębie okna: zaczynamy ciszej
    const prog = clamp((now - w[0]) / (w[1] - w[0]), 0, 1);
    Sound.cue(S.settings.cueSound, S.settings.cueVol * (0.6 + 0.4 * prog));
    s.cuesPlayed++; s.nextCue = now + rand(2, 4) * 60000; save();
  }
}
function showNightScreen() {
  const s = S.session; const p = s.plan; const next = s.phase === 'sleep1' && p.wbtb ? `WBTB ${fmtTime(p.wbtbAt)}` : `Pobudka ${fmtTime(p.morningAt)}`;
  overlay(`<div class="nightscreen" id="ns">
    <div class="nclock" id="nclock">${fmtTime(Date.now())}</div>
    <div class="nlabel">${next}${p.tlr && p.cueWindows.length ? ' · cue aktywne' : ''}</div>
    <div class="nlabel" style="margin-top:22px;max-width:320px">Następnym razem, gdy będę śnić, zapamiętam, że śnię.</div>
    <div class="nrow"><button class="nbtn" data-n="note">Obudziłem/am się – notatka</button><button class="nbtn" data-n="end">Zakończ noc</button></div>
  </div>`, {
    note: () => quickNote(() => showNightScreen()),
    end: () => { if (confirm('Zakończyć noc?')) endNight(); },
  });
}
function overlay(html, handlers = {}) {
  let o = $('#overlay'); if (!o) { o = document.createElement('div'); o.id = 'overlay'; document.body.appendChild(o); }
  o.innerHTML = html; $$('[data-n]', o).forEach((b) => b.onclick = () => handlers[b.dataset.n]?.());
  return o;
}
function hideOverlay() { $('#overlay')?.remove(); }
function showAlarm(kind) {
  Sound.startAlarm(S.session.plan.alarmStyle);
  const msg = kind === 'wbtb' ? 'Pobudka WBTB' : 'Dzień dobry';
  overlay(`<div class="nightscreen alarm">
    <div class="nclock" id="nclock">${fmtTime(Date.now())}</div>
    <div class="nlabel">${msg}</div>
    <p style="color:#a5a0c8;max-width:340px;margin-top:16px">Wyłącz budzik i <b>nie ruszaj się</b>. Zostań w tej samej pozycji i odtwórz sen od ostatniej sceny.</p>
    <button class="nbtn" data-n="stop">Wyłącz budzik</button>
  </div>`, { stop: () => { Sound.stopAlarm(); recallScreen(kind); } });
}
function recallScreen(kind) {
  let n = 30;
  overlay(`<div class="nightscreen guide">
    <div class="ring pulse" id="rRing">${n}</div>
    <div class="gtext">Nie ruszaj się.<br>Co działo się przed chwilą?</div>
    <div class="gsub">Ostatnia scena → co było wcześniej → jeszcze wcześniej</div>
    <div class="nrow"><button class="nbtn" data-n="write">Zapisz sen</button><button class="nbtn" data-n="none">Nic nie pamiętam</button></div>
  </div>`, {
    write: () => { clearInterval(t); quickNote(() => afterRecall(kind)); },
    none: () => { clearInterval(t); markNight(kind === 'morning' ? { noRecall: !S.dreams.some((d) => d.night === nightKey(S.session.start)) } : { noRecallWbtb: true }); afterRecall(kind); },
  });
  const t = setInterval(() => { n--; const r = $('#rRing'); if (!r || n < 0) return clearInterval(t); r.textContent = n || '✎'; }, 1000);
}
function quickNote(after) {
  overlay(`<div class="nightscreen guide" style="justify-content:flex-start;padding-top:40px">
    <div class="gsub" style="margin-bottom:10px">Słowa-klucze wystarczą. Rano dopiszesz resztę.</div>
    <textarea id="qn" placeholder="np. szkoła, latanie, babcia, czerwone drzwi…" style="min-height:40vh"></textarea>
    <div class="nrow" style="margin-top:10px">
      ${(window.SpeechRecognition || window.webkitSpeechRecognition) ? '<button class="nbtn" data-n="mic" id="qnMic">🎙 Dyktuj</button>' : ''}
      <label class="nbtn" style="display:flex;gap:8px;align-items:center;margin-top:26px"><input type="checkbox" id="qnL"> świadomy</label>
      <button class="nbtn" data-n="save">Zapisz</button><button class="nbtn" data-n="skip">Pomiń</button>
    </div></div>`, {
    mic: () => toggleDictation($('#qn'), $('#qnMic')),
    save: () => {
      stopDictation(); const text = $('#qn').value.trim();
      if (text) {
        const d = { id: uid(), ts: Date.now(), title: '', text, lucidity: $('#qnL').checked ? 2 : 0, vivid: 3, emotions: [], tags: [], signs: [], technique: guessTechnique(), nightmare: false, falseAwake: false, fragment: true };
        d.night = nightKey(d.ts); S.dreams.push(d); save(); toast('Zapisane');
      }
      after();
    },
    skip: () => { stopDictation(); after(); },
  });
  setTimeout(() => $('#qn')?.focus(), 100);
}
function markNight(extra) {
  const k = nightKey(S.session?.start || Date.now()); let n = S.nights.find((x) => x.night === k);
  if (!n) { n = { id: uid(), night: k }; S.nights.push(n); }
  Object.assign(n, extra); save(); return n;
}
function afterRecall(kind) {
  const s = S.session;
  if (kind === 'morning') { endNight(true); return; }
  s.phase = 'awake'; s.awakeUntil = Date.now() + s.plan.awakeMin * 60000; s.awakeAlerted = false; save();
  markNight({ wbtbDone: true, wbtbAt: Date.now(), technique: s.plan.technique === 'none' ? 'wbtb' : s.plan.technique });
  if (s.plan.awakeMin === 0) { sessionGuide(s.plan.technique); return; }
  overlay(`<div class="nightscreen guide">
    <div class="gsub">Czuwanie</div>
    <div class="nclock" id="awakeLeft" style="color:#8e86c4">${s.plan.awakeMin}:00</div>
    <ul style="text-align:left;color:#7d77ad;max-width:360px;line-height:1.7">
      <li>Przyćmione światło, bez scrollowania social mediów</li>
      <li>Toaleta, łyk wody</li>
      <li>Przeczytaj swój sen i znaki snu</li>
      <li>Zrób uważny reality check</li>
      <li>Pomyśl: czego chcesz spróbować w świadomym śnie?</li>
    </ul>
    <div class="nrow"><button class="nbtn" data-n="go">Zaczynam technikę →</button><button class="nbtn" data-n="signs">Moje znaki snu</button></div>
  </div>`, {
    go: () => sessionGuide(s.plan.technique),
    signs: () => { const list = S.signs.map((x) => x.name).join(', ') || 'jeszcze brak – dodasz je w dzienniku'; alert('Twoje znaki snu: ' + list); },
  });
}

/* Skrypty prowadzenia (tekst + pauza w sekundach). {cue} = odtwórz dźwięk cue i zrób check. */
function guideScript(kind) {
  const signs = S.signs.slice(0, 3).map((s) => s.name);
  const signLine = signs.length ? `Gdy zobaczę ${signs.join(', albo ')}, zrozumiem, że śnię.` : 'Gdy zobaczę coś dziwnego, zrozumiem, że śnię.';
  const cueIntro = (S.session ? S.session.plan.tlr : S.settings.tlr) ? [
    ['Teraz trening dźwięku. Za chwilę usłyszysz cue. Za każdym razem, gdy go usłyszysz, sprawdź uważnie swój stan.', 2],
    ['{cue}', 4], ['Poczuj ciało. Zauważ myśli. Zauważ emocje. Zapytaj: czy śnię?', 12],
    ['{cue}', 4], ['Gdzie jestem? Jak się tu znalazłem? Czy coś jest dziwne?', 12],
    ['{cue}', 4], ['Ten dźwięk przypomni mi we śnie, że śnię.', 8],
  ] : [];
  if (kind === 'mild') return [
    ['Leż wygodnie. Oddychaj spokojnie. Zaczynamy MILD.', 4],
    ['Przypomnij sobie sen, z którego się obudziłeś. Ostatnia scena. Kto tam był? Gdzie byłeś?', 40],
    ['Znajdź w tym śnie coś dziwnego. Coś, co mogło być sygnałem, że śnisz.', 25],
    ...cueIntro,
    ['Powtarzaj w myślach z prawdziwą intencją: Następnym razem, gdy będę śnić, zapamiętam, że śnię.', 20],
    [signLine, 15],
    ['Teraz wyobraź sobie, że wracasz do tego snu. Widzisz znak snu. I właśnie wtedy rozumiesz: to sen. Jestem świadomy.', 45],
    ['Co robisz dalej w świadomym śnie? Zobacz to wyraźnie.', 30],
    ['Następnym razem, gdy będę śnić, zapamiętam, że śnię.', 20],
    ['Powtarzaj intencję i wizualizację, aż poczujesz, że zostanie z tobą. Potem po prostu zasypiaj. Dobrej nocy.', 6],
  ];
  if (kind === 'ssild') {
    const out = [['Leż wygodnie z zamkniętymi oczami. Zaczynamy SSILD. Nie staraj się niczego zobaczyć na siłę. Tylko obserwuj.', 5], ...cueIntro, ['Najpierw szybkie cykle.', 2]];
    for (let i = 0; i < 5; i++) out.push(['Wzrok', 3], ['Słuch', 3], ['Ciało', 3]);
    out.push(['Teraz wolne cykle. Spokojnie, bez wysiłku.', 3]);
    for (let i = 0; i < 4; i++) out.push(['Wzrok. Ciemność pod powiekami.', 30], ['Słuch. Dźwięki wokół i w głowie.', 30], ['Ciało. Ciężar, temperatura, oddech.', 30]);
    out.push(['Koniec. Przyjmij ulubioną pozycję i po prostu zasypiaj. Jeśli się obudzisz, zrób reality check. Zatkaj nos i spróbuj oddychać.', 4]);
    return out;
  }
  if (kind === 'presleep') return [
    ['Dobry wieczór. Krótki trening przed snem.', 3], ...cueIntro,
    ['Dziś w nocy usłyszysz ten dźwięk cicho we śnie. Gdy go usłyszysz, zrób reality check.', 6],
    ['Następnym razem, gdy będę śnić, zapamiętam, że śnię. Dobrej nocy.', 4],
  ];
  return [['Zasypiaj spokojnie. Następnym razem, gdy będę śnić, zapamiętam, że śnię.', 4]];
}
let guideAbort = false;
async function sessionGuide(kind) {
  guideAbort = false;
  const steps = guideScript(kind);
  overlay(`<div class="nightscreen guide">
    <div class="gsub" id="gStep">${kind === 'presleep' ? 'Trening przed snem' : kind.toUpperCase()}</div>
    <div class="gtext" id="gText">…</div>
    <div class="gsub" id="gTimer"></div>
    <div class="nrow"><button class="nbtn" data-n="skip">Pomiń → śpię</button>${S.settings.voice ? '<button class="nbtn" data-n="mute">Wycisz głos</button>' : ''}</div>
  </div>`, {
    skip: () => { guideAbort = true; speechSynthesis?.cancel(); finishGuide(); },
    mute: () => { S.settings.voice = false; save(); speechSynthesis?.cancel(); },
  });
  for (let i = 0; i < steps.length && !guideAbort; i++) {
    const [text, pause] = steps[i];
    const tEl = $('#gText'); if (!tEl) return;
    if (text === '{cue}') { tEl.innerHTML = '<span class="pulse">♪</span>'; Sound.cue(S.settings.cueSound, Math.max(0.12, S.settings.cueVol * 1.5)); }
    else { tEl.textContent = text; await speak(text); }
    const end = Date.now() + pause * 1000;
    while (Date.now() < end && !guideAbort) {
      const tm = $('#gTimer'); if (tm) tm.textContent = pause >= 10 ? `${Math.ceil((end - Date.now()) / 1000)} s` : '';
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (!guideAbort) finishGuide();
}
function finishGuide() {
  if (practiceMode) { practiceMode = false; hideOverlay(); return; }
  const s = S.session; if (!s) return hideOverlay();
  if (s.phase === 'awake') {
    s.phase = 'sleep2';
    // przelicz okna cue od rzeczywistego powrotu do łóżka
    const ret = Date.now() + s.plan.latency * 60000 * 0.5; const C = s.plan.cycle * 60000; const morning = s.plan.morningAt;
    if (s.plan.tlr) {
      const st = ret + s.plan.tlrDelay * 60000; const w = [[st, Math.min(st + 45 * 60000, morning - 10 * 60000)]];
      for (let t = st + C * 0.75; t < morning - 25 * 60000; t += C) w.push([t, Math.min(t + 25 * 60000, morning - 10 * 60000)]);
      s.plan.cueWindows = w.filter(([a, b]) => b - a > 5 * 60000);
    }
    s.nextCue = null; save();
  }
  showNightScreen();
}
function endNight(morning = false) {
  const s = S.session; Sound.stopAlarm(); Sound.keepAlive(false); lockScreen(false); clearInterval(tick); speechSynthesis?.cancel();
  if (s) {
    const tech = s.plan.wbtb ? (s.plan.technique === 'none' ? 'wbtb' : s.plan.technique) : (s.plan.tlr ? 'tlr' : 'none');
    const n = markNight({ sessionStart: s.start, sessionEnd: Date.now(), cues: s.cuesPlayed, plan: { wbtb: s.plan.wbtb, tlr: s.plan.tlr, technique: s.plan.technique } });
    if (!n.technique) n.technique = tech;
  }
  S.session = null; save(); hideOverlay(); go('journal');
  if (morning) setTimeout(() => dreamEditor(), 300);
}
function resumeIfSession() {
  if (!S.session) return;
  overlay(`<div class="nightscreen"><div class="nlabel">Trwa noc w Somnii</div><div class="nrow"><button class="nbtn" data-n="resume">Dotknij, aby wznowić</button><button class="nbtn" data-n="end">Zakończ noc</button></div></div>`, {
    resume: () => {
      Sound.ensure(); Sound.keepAlive(true); lockScreen(true);
      const ph = S.session.phase;
      if (ph === 'alarm-wbtb') showAlarm('wbtb'); else if (ph === 'alarm-morning') showAlarm('morning');
      else if (ph === 'awake') afterRecallResume(); else showNightScreen();
      runTick();
    },
    end: () => endNight(),
  });
}
function afterRecallResume() { const s = S.session; s.phase = 'sleep1'; afterRecall('wbtb'); }

/* ================= DZIEŃ ================= */
let rcTimer = null;
VIEWS.day = () => {
  const today = dayKey(new Date()); const dl = daily(today); const wk = currentWeek();
  const rcToday = S.rc.filter((r) => dayKey(r.ts) === today);
  const st = S.settings;
  return `
  <div class="card glow">
    <div class="row between"><h2>Dziś · tydzień ${wk.week}</h2><span class="tag">${esc(wk.title)}</span></div>
    <p class="muted small">${esc(wk.goal)}</p>
    ${wk.tasks.map((t, i) => `<label class="check"><input type="checkbox" data-task="${i}" ${dl.tasks[i] ? 'checked' : ''}> <span>${esc(t)}</span></label>`).join('')}
  </div>

  <div class="card">
    <div class="row between"><h2>Reality checki</h2><div class="stat" style="padding:6px 12px"><span class="v" style="font-size:1.2rem">${rcToday.length}</span><span class="l"> / ${st.rcPerDay} dziś</span></div></div>
    <button class="btn primary big block" data-act="rc">Czy śnię? – zrób check</button>
    <hr>
    <label class="switch"><span><b>Przypomnienia w aplikacji</b><br><span class="small muted">losowo, gdy Somnia jest otwarta (także w tle karty)</span></span><input type="checkbox" data-set="inAppRc" ${st.inAppRc ? 'checked' : ''}></label>
    <div class="rc-times">
      <div><label>Od</label><input type="time" data-input="rcStart" value="${st.rcStart}"></div>
      <div><label>Do</label><input type="time" data-input="rcEnd" value="${st.rcEnd}"></div>
      <div><label>Ile dziennie</label><input type="number" min="3" max="30" data-input="rcPerDay" value="${st.rcPerDay}"></div>
    </div>
    <p class="small muted" style="margin-top:12px"><b>Niezawodne przypomnienia na telefonie:</b> pobierz plik kalendarza z losowymi godzinami RC na 14 dni i zaimportuj do Kalendarza Google / iPhone – telefon powiadomi Cię nawet przy zamkniętej aplikacji.</p>
    <button class="btn cyan sm" data-act="ics">⬇ Pobierz przypomnienia (.ics)</button>
  </div>

  <div class="card">
    <h2>Cele dnia</h2>
    <p class="small muted">Pamięć prospektywna: gdy zauważysz cel – zrób reality check. Najlepsze cele to Twoje znaki snu.</p>
    ${dl.targets.map((t, i) => `<label class="check"><input type="checkbox" data-target="${i}" ${t.done ? 'checked' : ''}> <span style="flex:1">${esc(t.text)}</span><button class="btn ghost sm" data-deltarget="${i}">✕</button></label>`).join('') || '<p class="dim small">Brak celów na dziś.</p>'}
    <div class="row" style="margin-top:8px"><input type="text" id="newTarget" placeholder="np. gdy zobaczę psa / gdy otworzę drzwi" style="flex:1"><button class="btn sm" data-act="add-target">Dodaj</button></div>
    ${S.signs.length ? `<div class="chips" style="margin-top:8px">${S.signs.slice(0, 6).map((s) => `<button class="chip" data-quicktarget="${esc(s.name)}">+ ${esc(s.name)}</button>`).join('')}</div>` : ''}
  </div>

  <div class="card">
    <div class="row between"><h2>Znaki snu</h2><button class="btn sm" data-act="add-sign">+ Dodaj</button></div>
    <p class="small muted">Elementy, które powtarzają się w Twoich snach. To one mają Cię „obudzić” we śnie.</p>
    ${signsList()}
    ${signSuggestions()}
  </div>

  <div class="card">
    <h2>Intencja na noc</h2>
    <textarea id="intention" style="min-height:70px" placeholder="np. Dziś w nocy zauważę, że śnię, i polecę nad miastem.">${esc(dl.intention)}</textarea>
  </div>`;
};
function signsList() {
  if (!S.signs.length) return '<p class="dim small">Brak – oznaczaj je w dzienniku albo dodaj z sugestii poniżej.</p>';
  const counts = {}; S.dreams.forEach((d) => (d.signs || []).forEach((id) => counts[id] = (counts[id] || 0) + 1));
  return S.signs.slice().sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).map((s) => `
    <div class="check"><span class="tag sign">◆</span><span style="flex:1"><b>${esc(s.name)}</b> <span class="dim small">· ${DREAMSIGN_CATS.find((c) => c.id === s.cat)?.label || ''} · ${counts[s.id] || 0}× w snach</span></span><button class="btn ghost sm" data-delsign="${s.id}">✕</button></div>`).join('');
}
function suggestSigns() {
  const freq = {};
  S.dreams.forEach((d) => {
    const words = new Set(((d.title || '') + ' ' + (d.text || '')).toLowerCase().match(/[a-ząćęłńóśźż]{4,}/g) || []);
    (d.tags || []).forEach((t) => words.add(t));
    words.forEach((w) => { if (!STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1; });
  });
  const have = new Set(S.signs.map((s) => s.name.toLowerCase()));
  return Object.entries(freq).filter(([w, c]) => c >= 2 && !have.has(w)).sort((a, b) => b[1] - a[1]).slice(0, 12);
}
function signSuggestions() {
  const sug = suggestSigns(); if (!sug.length) return '';
  return `<p class="small muted" style="margin-top:10px">Powtarza się w Twoich snach – może to znak snu?</p><div class="chips">${sug.map(([w, c]) => `<button class="chip" data-sugsign="${esc(w)}">+ ${esc(w)} <span class="dim">${c}×</span></button>`).join('')}</div>`;
}
function addSignDialog(name = '') {
  openModal(`<div class="row between"><h2>Nowy znak snu</h2><button class="btn ghost sm" data-close>✕</button></div>
    <label>Nazwa</label><input type="text" id="sName" value="${esc(name)}" placeholder="np. latanie, stara szkoła, mama">
    <label>Kategoria</label><div class="seg" id="sCat">${DREAMSIGN_CATS.map((c, i) => `<button data-v="${c.id}" class="${i === 0 ? 'on' : ''}" title="${c.hint}">${c.label}</button>`).join('')}</div>
    <p class="small dim" id="sHint">${DREAMSIGN_CATS[0].hint}</p>
    <button class="btn primary block" id="sSave" style="margin-top:12px">Dodaj</button>`, (box) => {
    $('[data-close]', box).onclick = closeModal; let cat = 'action';
    $$('#sCat button', box).forEach((b) => b.onclick = () => { cat = b.dataset.v; $$('#sCat button', box).forEach((x) => x.classList.toggle('on', x === b)); $('#sHint', box).textContent = DREAMSIGN_CATS.find((c) => c.id === cat).hint; });
    $('#sSave', box).onclick = () => {
      const n = $('#sName', box).value.trim(); if (!n) return;
      const sign = { id: uid(), name: n, cat, created: Date.now() }; S.signs.push(sign);
      // automatycznie oznacz w snach, gdzie to słowo występuje
      const low = n.toLowerCase(); let k = 0;
      S.dreams.forEach((d) => { if (((d.title || '') + ' ' + d.text + ' ' + (d.tags || []).join(' ')).toLowerCase().includes(low)) { d.signs = [...new Set([...(d.signs || []), sign.id])]; k++; } });
      save(); closeModal(); render(); toast(k ? `Dodano i oznaczono w ${k} snach` : 'Dodano znak snu');
    };
  });
}
function rcDialog() {
  const test = pick(REALITY_CHECKS.filter((r) => r.reliability >= 3)); const q = pick(RC_QUESTIONS);
  openModal(`<div class="row between"><h2>Czy śnię?</h2><button class="btn ghost sm" data-close>✕</button></div>
    <div class="card" style="margin:8px 0"><h3>1. ${esc(test.name)}</h3><p>${esc(test.how)}</p></div>
    <div class="card" style="margin:8px 0"><h3>2. Krytyczna refleksja</h3><p>${esc(q)}</p></div>
    <div class="card" style="margin:8px 0"><h3>3. Zatkaj nos i spróbuj oddychać</h3><p class="muted small">Najbardziej niezawodny test – rób go zawsze jako drugi.</p></div>
    <label>Jak uważnie to zrobiłeś/aś?</label>
    <div class="seg" id="rcM"><button data-v="1">Odruchowo</button><button data-v="2" class="on">Uważnie</button><button data-v="3">Naprawdę zwątpiłem/am</button></div>
    <button class="btn primary block big" id="rcSave" style="margin-top:14px">Zrobione ✓</button>`, (box) => {
    $('[data-close]', box).onclick = closeModal; let m = 2;
    $$('#rcM button', box).forEach((b) => b.onclick = () => { m = +b.dataset.v; $$('#rcM button', box).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#rcSave', box).onclick = () => { S.rc.push({ ts: Date.now(), test: test.id, mindful: m }); save(); closeModal(); if (TAB === 'day' || TAB === 'stats') render(); toast('Reality check zapisany ✓'); };
  });
}
function scheduleInAppRc() {
  clearTimeout(rcTimer); if (!S.settings.inAppRc) return;
  const st = S.settings; const [sh, sm] = st.rcStart.split(':').map(Number); const [eh, em] = st.rcEnd.split(':').map(Number);
  const now = new Date(); const start = new Date(now); start.setHours(sh, sm, 0, 0); const end = new Date(now); end.setHours(eh, em, 0, 0);
  const windowMin = Math.max(30, (end - start) / 60000); const avg = windowMin / st.rcPerDay;
  let next = Date.now() + rand(0.5, 1.5) * avg * 60000;
  if (now < start) next = start.getTime() + rand(0, avg) * 60000;
  if (next > end.getTime()) { start.setDate(start.getDate() + 1); next = start.getTime() + rand(0, avg) * 60000; }
  rcTimer = setTimeout(fireRc, Math.min(next - Date.now(), 2 ** 31 - 1));
}
function fireRc() {
  const t = pick(REALITY_CHECKS);
  const body = `${t.name}: ${t.how}`;
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    navigator.serviceWorker?.ready.then((reg) => reg.showNotification('Czy śnię? ☾', { body, icon: 'icons/icon-192.png', tag: 'rc', renotify: true })).catch(() => new Notification('Czy śnię? ☾', { body }));
  } else { toast('☾ Czy śnię? ' + body, 6000); navigator.vibrate && navigator.vibrate(200); }
  scheduleInAppRc();
}
function exportIcs() {
  const st = S.settings; const days = 14; const [sh, sm] = st.rcStart.split(':').map(Number); const [eh, em] = st.rcEnd.split(':').map(Number);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Somnia//Reality checks//PL', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Somnia – reality checki'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const f = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  for (let i = 0; i < days; i++) {
    const s = new Date(); s.setDate(s.getDate() + i); s.setHours(sh, sm, 0, 0); const e = new Date(s); e.setHours(eh, em, 0, 0);
    const span = (e - s) / 60000; if (span < 30) continue; const n = clamp(st.rcPerDay, 1, 30); const slot = span / n;
    for (let k = 0; k < n; k++) {
      const t = new Date(s.getTime() + (k * slot + rand(0.1, 0.9) * slot) * 60000); if (t < new Date()) continue;
      const rc = pick(REALITY_CHECKS);
      lines.push('BEGIN:VEVENT', `UID:${uid()}@somnia`, `DTSTAMP:${stamp}`, `DTSTART:${f(t)}`, 'DURATION:PT1M', 'SUMMARY:☾ Czy śnię? – reality check',
        `DESCRIPTION:${rc.name}: ${rc.how.replace(/[,;]/g, (c) => '\\' + c)}`, 'TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Czy śnię?', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  download('somnia-reality-checki.ics', lines.join('\r\n'), 'text/calendar');
  toast('Plik pobrany – otwórz go, aby dodać do kalendarza');
}

/* ================= TECHNIKI ================= */
VIEWS.learn = () => `
  <div class="card glow">
    <h2>Co naprawdę działa</h2>
    <p class="muted small">Największe badania (Aspy 2017 i 2020, Konkoly i in. 2024) wskazują: <b>dobra pamięć snów</b> + <b>WBTB</b> + <b>MILD lub SSILD</b> + <b>szybkie zaśnięcie po technice</b>. Cue dźwiękowe (TLR) to obiecujący dodatek. Reality checki pomagają w połączeniu z innymi technikami.</p>
    <div class="legend">${Object.values(EVIDENCE).map((e) => `<span class="ev ${e.cls}">${e.label}</span>`).join('')}</div>
  </div>
  ${TECHNIQUES.map((t) => `<details class="card"><summary><div class="row between"><div><h3 style="margin:0">${esc(t.name)} <span class="chev">›</span></h3><div class="small dim">${esc(t.full)}</div></div><span class="ev ${EVIDENCE[t.evidence].cls}">${EVIDENCE[t.evidence].label}</span></div><p class="small muted" style="margin-top:8px">${esc(t.summary)}</p></summary>
    <p class="small"><b>Kiedy:</b> ${esc(t.when)}</p>
    <ol class="steps">${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    ${t.tips?.length ? `<ul class="clean small muted">${t.tips.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    <p class="small" style="background:#10142b;padding:10px;border-radius:10px"><b>Badania:</b> ${esc(t.why)}</p>
    ${['mild', 'ssild'].includes(t.id) ? `<button class="btn sm" data-practice="${t.id}">▶ Przećwicz teraz (prowadzenie)</button>` : ''}
  </details>`).join('')}
  <div class="section-title"><h2>Reality checki</h2></div>
  <div class="card">${REALITY_CHECKS.map((r) => `<div class="check"><span style="flex:1"><b>${esc(r.name)}</b><br><span class="small muted">${esc(r.how)}</span></span><span class="small" title="niezawodność" style="color:var(--gold)">${'★'.repeat(r.reliability)}${'☆'.repeat(5 - r.reliability)}</span></div>`).join('')}</div>
  <div class="section-title"><h2>Program 4 tygodni</h2></div>
  ${PROGRAM.map((w) => `<div class="card ${currentWeek().week === w.week ? 'glow' : ''}"><div class="row between"><h3 style="margin:0">Tydzień ${w.week}: ${esc(w.title)}</h3>${currentWeek().week === w.week ? '<span class="tag lucid">teraz</span>' : ''}</div><p class="small muted">${esc(w.goal)}</p></div>`).join('')}
  <div class="section-title"><h2>W świadomym śnie</h2></div>
  <div class="card small">
    <ul class="clean">
      <li><b>Stabilizacja:</b> gdy sen się rozmywa – potrzyj dłonie, dotknij czegoś, powiedz na głos „wyrazistość teraz!”, skup się na zmysłach.</li>
      <li><b>Nie ekscytuj się zbyt mocno</b> – silne emocje często budzą. Spokojnie oddychaj.</li>
      <li><b>Fałszywe przebudzenie:</b> po każdym „przebudzeniu” zatkaj nos i spróbuj oddychać.</li>
      <li><b>Miej plan:</b> zdecyduj na jawie, co chcesz zrobić (latanie, spotkanie, ćwiczenie umiejętności). Wpisz to w intencję dnia.</li>
      <li><b>Koszmar:</b> jeśli staniesz się świadomy/a, możesz zapytać postać „kim jesteś?” albo zmienić scenę – lęk często słabnie.</li>
    </ul>
  </div>
  <div class="section-title"><h2>Bezpieczeństwo</h2></div>
  <div class="card small"><ul class="clean">${SAFETY.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
  <p class="small dim" style="text-align:center">Źródła i opis badań: README w repozytorium.</p>`;

/* ================= POSTĘPY ================= */
function currentWeek() {
  const days = Math.floor((Date.now() - fromKey(S.programStart).getTime()) / 864e5);
  return PROGRAM[clamp(Math.floor(days / 7), 0, PROGRAM.length - 1)];
}
function computeStats() {
  const nights = {}; // night -> {dreams, lucid, tech, noRecall}
  S.dreams.forEach((d) => { const n = (nights[d.night] ||= { dreams: 0, lucid: 0, tech: new Set() }); n.dreams++; if (d.lucidity >= 2) n.lucid++; if (d.technique && d.technique !== 'none') n.tech.add(d.technique); });
  S.nights.forEach((x) => { const n = (nights[x.night] ||= { dreams: 0, lucid: 0, tech: new Set() }); if (x.technique && x.technique !== 'none') n.tech.add(x.technique); n.logged = true; });
  const keys = Object.keys(nights).sort();
  const last30 = keys.filter((k) => Date.now() - fromKey(k).getTime() < 30 * 864e5);
  const recallNights = last30.filter((k) => nights[k].dreams > 0).length;
  const lucidNights = last30.filter((k) => nights[k].lucid > 0).length;
  // seria: kolejne noce z wpisem (sen lub „nic nie pamiętam”)
  let streak = 0; const d = new Date(); if (d.getHours() < 15) d.setDate(d.getDate() - 1);
  if (!nights[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (nights[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
  // skuteczność technik
  const tech = {};
  keys.forEach((k) => { const n = nights[k]; const ts = n.tech.size ? [...n.tech] : ['none']; ts.forEach((t) => { const o = (tech[t] ||= { nights: 0, lucid: 0 }); o.nights++; if (n.lucid) o.lucid++; }); });
  const emo = {}; S.dreams.forEach((x) => (x.emotions || []).forEach((e) => emo[e] = (emo[e] || 0) + 1));
  const rc7 = S.rc.filter((r) => Date.now() - r.ts < 7 * 864e5).length / 7;
  return { nights, keys, last30, recallNights, lucidNights, streak, tech, emo, rc7 };
}
VIEWS.stats = () => {
  const st = computeStats(); const total = S.dreams.length; const lucid = S.dreams.filter((d) => d.lucidity >= 2).length;
  // heatmapa 5 tygodni
  const cells = []; const end = new Date(); if (end.getHours() < 15) end.setDate(end.getDate() - 1);
  const start = new Date(end); start.setDate(start.getDate() - 34); while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
  for (let x = new Date(start); x <= end; x.setDate(x.getDate() + 1)) {
    const k = dayKey(x); const n = st.nights[k];
    const cls = n ? (n.lucid ? 'lu' : n.dreams >= 2 ? 'd2' : n.dreams ? 'd1' : '') : '';
    cells.push(`<div class="${cls} ${k === dayKey(end) ? 'today' : ''}" title="${nightLabel(k)}: ${n ? n.dreams + ' snów' + (n.lucid ? ', świadomy!' : '') : 'brak wpisu'}"></div>`);
  }
  // słupki: 8 tygodni
  const weeks = []; for (let i = 7; i >= 0; i--) { const a = Date.now() - (i + 1) * 7 * 864e5, b = Date.now() - i * 7 * 864e5; const ds = S.dreams.filter((d) => d.ts >= a && d.ts < b); weeks.push({ n: ds.length, l: ds.filter((d) => d.lucidity >= 2).length, label: fmtDate(b - 864e5) }); }
  const maxW = Math.max(1, ...weeks.map((w) => w.n)); const W = 320, H = 120, bw = W / 8;
  const bars = weeks.map((w, i) => { const h = (w.n / maxW) * (H - 22), hl = (w.l / maxW) * (H - 22); return `<rect x="${i * bw + 6}" y="${H - 16 - h}" width="${bw - 12}" height="${h}" rx="4" fill="#2f3b85"/><rect x="${i * bw + 6}" y="${H - 16 - hl}" width="${bw - 12}" height="${hl}" rx="4" fill="#8b5cf6"/>${w.n ? `<text x="${i * bw + bw / 2}" y="${H - 20 - h}" text-anchor="middle">${w.n}</text>` : ''}<text x="${i * bw + bw / 2}" y="${H - 2}" text-anchor="middle">${i === 7 ? 'teraz' : w.label}</text>`; }).join('');
  const techRows = Object.entries(st.tech).sort((a, b) => b[1].nights - a[1].nights);
  const topSigns = (() => { const c = {}; S.dreams.forEach((d) => (d.signs || []).forEach((id) => c[id] = (c[id] || 0) + 1)); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => [S.signs.find((s) => s.id === id)?.name, n]).filter((x) => x[0]); })();
  const avgPerNight = st.last30.length ? (st.last30.reduce((s, k) => s + st.nights[k].dreams, 0) / st.last30.length).toFixed(1) : '–';
  return `
  <div class="grid3" style="margin-top:10px">
    <div class="stat"><div class="v">${total}</div><div class="l">zapisanych snów</div></div>
    <div class="stat"><div class="v" style="color:#c4b5fd">${lucid}</div><div class="l">świadomych snów</div></div>
    <div class="stat"><div class="v">${st.streak}</div><div class="l">noce z rzędu w dzienniku</div></div>
    <div class="stat"><div class="v">${st.last30.length ? Math.round(st.recallNights / st.last30.length * 100) + '%' : '–'}</div><div class="l">nocy z pamiętanym snem (30 dni)</div></div>
    <div class="stat"><div class="v">${avgPerNight}</div><div class="l">snów na noc (30 dni)</div></div>
    <div class="stat"><div class="v">${st.rc7.toFixed(1)}</div><div class="l">RC dziennie (7 dni)</div></div>
  </div>
  <div class="card">
    <div class="row between"><h3 style="margin:0">Ostatnie 5 tygodni</h3><div class="legend"><span><i style="background:#2b3a7a"></i>sen</span><span><i style="background:#4b5bc0"></i>2+</span><span><i style="background:#8b5cf6"></i>świadomy</span></div></div>
    <div class="heat" style="margin-top:10px">${DAYS.slice(1).concat(DAYS[0]).map((d) => `<span class="small dim" style="text-align:center">${d}</span>`).join('')}${cells.join('')}</div>
  </div>
  <div class="card"><h3>Sny tygodniowo</h3><svg class="bars" viewBox="0 0 ${W} ${H}" width="100%">${bars}</svg><div class="legend"><span><i style="background:#2f3b85"></i>wszystkie</span><span><i style="background:#8b5cf6"></i>świadome</span></div></div>
  <div class="card">
    <h3>Co działa u Ciebie</h3>
    <p class="small muted">Odsetek nocy ze świadomym snem dla każdej techniki. Potrzeba kilku nocy na technikę, żeby wynik coś znaczył.</p>
    ${techRows.length ? techRows.map(([t, o]) => { const pct = Math.round(o.lucid / o.nights * 100); return `<div style="margin:10px 0"><div class="row between small"><span>${esc(techName(t))}</span><span class="muted">${o.lucid}/${o.nights} nocy · <b style="color:var(--text)">${pct}%</b></span></div><div style="height:8px;background:#1a1e3b;border-radius:4px;margin-top:4px"><div style="height:8px;width:${Math.max(2, pct)}%;background:linear-gradient(90deg,#6d28d9,#a78bfa);border-radius:4px"></div></div></div>`; }).join('') : '<p class="dim small">Zapisz kilka nocy, a tu pojawi się porównanie.</p>'}
  </div>
  <div class="grid2">
    <div class="card"><h3>Emocje</h3>${Object.entries(st.emo).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([e, n]) => `<div class="row between small"><span>${esc(e)}</span><span class="muted">${n}</span></div>`).join('') || '<p class="dim small">Brak danych</p>'}</div>
    <div class="card"><h3>Znaki snu</h3>${topSigns.map(([s, n]) => `<div class="row between small"><span class="tag sign">◆ ${esc(s)}</span><span class="muted">${n}</span></div>`).join('') || '<p class="dim small">Brak danych</p>'}</div>
  </div>
  <div class="section-title"><h2>Ustawienia</h2></div>
  <div class="card">
    <label>Start programu 4-tygodniowego</label><input type="date" data-progstart value="${S.programStart}">
    <label>Tempo głosu: <b>${S.settings.voiceRate}</b></label><input type="range" min="0.6" max="1.3" step="0.05" data-range="voiceRate" value="${S.settings.voiceRate}">
    <hr>
    <div class="row between"><span><b>PIN do dziennika</b><br><span class="small muted">${S.settings.pinHash ? 'włączony' : 'wyłączony'} · chroni przed podglądem, nie szyfruje danych</span></span><button class="btn sm" data-act="pin">${S.settings.pinHash ? 'Wyłącz' : 'Ustaw PIN'}</button></div>
    <hr>
    <p class="small muted">Dane są tylko na tym urządzeniu. Rób regularnie kopię zapasową.</p>
    <div class="row"><button class="btn sm" data-act="export">⬇ Kopia (JSON)</button><button class="btn sm" data-act="import">⬆ Wczytaj kopię</button><button class="btn sm" data-act="export-md">⬇ Dziennik (Markdown)</button></div>
    <input type="file" id="importFile" accept="application/json,.json" class="hidden">
    <hr>
    <div class="row"><button class="btn sm" data-act="notif">🔔 Zezwól na powiadomienia</button><button class="btn sm" data-act="demo">Dane przykładowe</button><button class="btn danger sm" data-act="reset">Usuń wszystko</button></div>
  </div>
  <p class="small dim" style="text-align:center">Somnia · open source · dane zostają u Ciebie</p>`;
};

/* ================= Wiązanie zdarzeń widoku ================= */
function bindView() {
  const v = $('#view');
  $$('[data-act]', v).forEach((b) => b.onclick = () => ACTIONS[b.dataset.act]?.(b));
  $$('[data-open]', v).forEach((c) => c.onclick = () => dreamView(c.dataset.open));
  $$('[data-filter]', v).forEach((b) => b.onclick = () => { jFilter = b.dataset.filter; render(); });
  const js = $('#jSearch', v); if (js) js.oninput = (e) => { jQuery = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#jSearch'); n.focus(); n.setSelectionRange(pos, pos); };
  $$('[data-set]', v).forEach((i) => i.onchange = () => {
    S.settings[i.dataset.set] = i.checked; save();
    if (i.dataset.set === 'inAppRc') { scheduleInAppRc(); if (i.checked) askNotif(); }
    render();
  });
  $$('[data-seg]', v).forEach((seg) => $$('button', seg).forEach((b) => b.onclick = () => { const k = seg.dataset.seg; const val = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; S.settings[k] = val; save(); render(); }));
  $$('[data-range]', v).forEach((r) => {
    r.oninput = () => { const lab = r.previousElementSibling?.querySelector('b'); const k = r.dataset.range; const val = +r.value; if (lab) lab.textContent = ['cueVol', 'alarmVol'].includes(k) ? Math.round(val * 100) + '%' : (k === 'voiceRate' ? val : val + ' min'); };
    r.onchange = () => { S.settings[r.dataset.range] = +r.value; save(); render(); };
  });
  $$('[data-input]', v).forEach((i) => i.onchange = () => { const k = i.dataset.input; S.settings[k] = i.type === 'number' ? clamp(+i.value || 0, +i.min || 0, +i.max || 999) : i.value; save(); if (k.startsWith('rc')) scheduleInAppRc(); render(); });
  $$('[data-task]', v).forEach((c) => c.onchange = () => { daily().tasks[c.dataset.task] = c.checked; save(); });
  $$('[data-target]', v).forEach((c) => c.onchange = () => { daily().targets[c.dataset.target].done = c.checked; if (c.checked) { S.rc.push({ ts: Date.now(), test: 'target', mindful: 2 }); toast('Cel zauważony – RC zaliczony ✓'); } save(); });
  $$('[data-deltarget]', v).forEach((b) => b.onclick = (e) => { e.preventDefault(); daily().targets.splice(+b.dataset.deltarget, 1); save(); render(); });
  $$('[data-quicktarget]', v).forEach((b) => b.onclick = () => { daily().targets.push({ text: 'gdy zobaczę: ' + b.dataset.quicktarget, done: false }); save(); render(); });
  $$('[data-delsign]', v).forEach((b) => b.onclick = () => { if (!confirm('Usunąć ten znak snu?')) return; const id = b.dataset.delsign; S.signs = S.signs.filter((s) => s.id !== id); S.dreams.forEach((d) => d.signs = (d.signs || []).filter((x) => x !== id)); save(); render(); });
  $$('[data-sugsign]', v).forEach((b) => b.onclick = () => addSignDialog(b.dataset.sugsign));
  $$('[data-practice]', v).forEach((b) => b.onclick = () => practice(b.dataset.practice));
  const it = $('#intention', v); if (it) it.oninput = () => { daily().intention = it.value; save(); };
  const ps = $('[data-progstart]', v); if (ps) ps.onchange = () => { if (ps.value) { S.programStart = ps.value; save(); toast('Program: ' + currentWeek().title); } };
  const imp = $('#importFile', v); if (imp) imp.onchange = importFile;
}
let practiceMode = false;
function practice(kind) { Sound.ensure(); practiceMode = true; sessionGuide(kind); }
async function askNotif() {
  if (!('Notification' in window)) { toast('Ta przeglądarka nie obsługuje powiadomień – użyj pliku .ics'); return; }
  const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Powiadomienia włączone' : 'Brak zgody na powiadomienia – użyj pliku .ics');
}
function importFile(e) {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const data = JSON.parse(rd.result); if (!Array.isArray(data.dreams)) throw new Error('format');
      if (!confirm(`Wczytać kopię (${data.dreams.length} snów)? Obecne dane zostaną zastąpione.`)) return;
      S = { ...fresh(), ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings }, session: null }; save(); render(); toast('Kopia wczytana');
    } catch (err) { toast('To nie jest poprawny plik kopii Somnii'); }
  };
  rd.readAsText(f);
}
const ACTIONS = {
  'new-dream': () => dreamEditor(),
  'go-night': () => go('night'),
  'no-recall': noRecall,
  'start-night': startNight,
  'test-cue': () => { Sound.ensure(); Sound.cue(); },
  'test-alarm': () => { Sound.startAlarm(); setTimeout(() => Sound.stopAlarm(), 5000); },
  'test-voice': () => { const prev = S.settings.voice; S.settings.voice = true; speak('Następnym razem, gdy będę śnić, zapamiętam, że śnię.').then(() => S.settings.voice = prev); if (!plVoice) toast('Brak polskiego głosu w systemie – użyty zostanie domyślny'); },
  rc: rcDialog,
  ics: exportIcs,
  'add-target': () => { const i = $('#newTarget'); if (!i.value.trim()) return; daily().targets.push({ text: i.value.trim(), done: false }); save(); render(); },
  'add-sign': () => addSignDialog(),
  export: () => download(`somnia-kopia-${dayKey(new Date())}.json`, JSON.stringify({ ...S, session: null }, null, 2)),
  import: () => $('#importFile').click(),
  'export-md': () => {
    const out = ['# Dziennik snów – Somnia', ''];
    S.dreams.slice().sort((a, b) => a.ts - b.ts).forEach((d) => {
      out.push(`## ${nightLabel(d.night)} · ${fmtTime(d.ts)} – ${d.title || 'Bez tytułu'}${d.lucidity >= 2 ? ' ✦' : ''}`);
      out.push(`*Świadomość: ${LUCIDITY_LEVELS[d.lucidity].label} · wyrazistość ${d.vivid}/5${d.technique && d.technique !== 'none' ? ' · ' + techName(d.technique) : ''}*`, '', d.text || '', '');
      const sg = (d.signs || []).map((id) => S.signs.find((s) => s.id === id)?.name).filter(Boolean);
      if (sg.length) out.push('Znaki snu: ' + sg.join(', '));
      if (d.tags?.length) out.push('Tagi: ' + d.tags.map((t) => '#' + t).join(' '));
      out.push('');
    });
    download(`dziennik-snow-${dayKey(new Date())}.md`, out.join('\n'), 'text/markdown');
  },
  notif: askNotif,
  pin: async () => {
    if (S.settings.pinHash) { S.settings.pinHash = null; save(); render(); toast('PIN wyłączony'); return; }
    const p = prompt('Nowy PIN (4–8 cyfr):'); if (!p || !/^\d{4,8}$/.test(p)) { if (p) toast('PIN musi mieć 4–8 cyfr'); return; }
    if (prompt('Powtórz PIN:') !== p) { toast('PIN-y się różnią'); return; }
    S.settings.pinHash = await sha256('somnia:' + p); save(); render(); toast('PIN ustawiony');
  },
  reset: () => { if (confirm('Usunąć WSZYSTKIE dane Somnii z tego urządzenia?') && confirm('Na pewno? Tego nie da się cofnąć.')) { S = fresh(); save(); go('journal'); } },
  demo: () => { if (S.dreams.length && !confirm('Dodać przykładowe sny do istniejących?')) return; seedDemo(); render(); toast('Dodano przykładowe dane'); },
};

function seedDemo() {
  const sign = { id: uid(), name: 'szkoła', cat: 'context', created: Date.now() }; const sign2 = { id: uid(), name: 'latanie', cat: 'action', created: Date.now() };
  S.signs.push(sign, sign2);
  const now = Date.now(); const day = 864e5;
  const texts = [
    ['Spóźniony egzamin', 'Byłem w starej szkole, korytarze były dłuższe niż zwykle. Szukałem sali na egzamin z anatomii, ale numery drzwi się zmieniały.', 0, [sign.id], 'none', ['lęk', 'zagubienie']],
    ['Dach nad miastem', 'Stałem na dachu bloku i nagle zacząłem unosić się nad miastem. Latanie było ciężkie, jakby w wodzie.', 1, [sign2.id], 'rc', ['zachwyt']],
    ['Basen w szkole', 'W szkole był basen zamiast sali gimnastycznej. Zauważyłem, że zegar pokazuje 25:70 – zrobiłem test z nosem i oddychałem! Wiedziałem, że śnię, poleciałem przez okno.', 2, [sign.id, sign2.id], 'mild', ['ekscytacja', 'radość']],
    ['Trening na plaży', 'Prowadziłem trening stacyjny na plaży, ludzie zamieniali się w inne osoby.', 0, [], 'ssild', ['spokój']],
  ];
  texts.forEach(([title, text, luc, signs, tech, emo], i) => {
    const ts = now - (texts.length - i) * day * 1.5 - 3 * 3600000;
    S.dreams.push({ id: uid(), ts, night: nightKey(ts), title, text, lucidity: luc, vivid: 3 + (luc ? 1 : 0), emotions: emo, tags: [], signs, technique: tech, nightmare: false, falseAwake: false, fragment: false });
  });
  for (let i = 0; i < 12; i++) S.rc.push({ ts: now - rand(0, 6) * day, test: 'nose', mindful: 2 });
  save();
}

/* ================= Start ================= */
$('#rcQuick').onclick = rcDialog;
async function checkLock() {
  if (!S.settings.pinHash) return;
  $('#lock').classList.remove('hidden');
  const tryUnlock = async () => {
    const h = await sha256('somnia:' + $('#lockPin').value);
    if (h === S.settings.pinHash) { $('#lock').classList.add('hidden'); $('#lockPin').value = ''; } else { $('#lockErr').textContent = 'Zły PIN'; $('#lockPin').value = ''; }
  };
  $('#lockBtn').onclick = tryUnlock; $('#lockPin').onkeydown = (e) => { if (e.key === 'Enter') tryUnlock(); };
  setTimeout(() => $('#lockPin').focus(), 100);
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (location.hash && VIEWS[location.hash.slice(1)]) TAB = location.hash.slice(1);
go(TAB);
checkLock();
scheduleInAppRc();
resumeIfSession();
