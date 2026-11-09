/* AI Remembrance Letter: стіл для листа (вибір голосу, ключових речей, пам'ятного епізоду і форми).
 * Конфіг голосів — <script type="application/json" id="rl-config">. Запит іде на window.PMSN_AI.endpoint (Cloudflare Worker);
 * відповідь — SSE {"t": "..."}. Нічого не зберігається в браузері. */
(function () {
  'use strict';
  var root = document.getElementById('rl-app');
  var cfgEl = document.getElementById('rl-config');
  if (!root || !cfgEl) return;
  var cfg = JSON.parse(cfgEl.textContent);
  var ENDPOINT = (window.PMSN_AI && window.PMSN_AI.endpoint) || '/api/ai-remembrance/';
  // Локальна розробка: Worker запущено на 127.0.0.1:8847 (на live — same-origin маршрут).
  if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) ENDPOINT = 'http://127.0.0.1:8847/api/ai-remembrance/';

  var ICONS = {
    tea: '<path d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3.5c0 1 1 1 1 2s-1 1-1 2"/>',
    kitchen: '<path d="M4 11h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6z"/><path d="M2 11h20"/><path d="M9 7c0-1.5 1-2 1-3"/><path d="M14 7c0-1.5 1-2 1-3"/>',
    garden: '<path d="M12 21v-9"/><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5z"/><path d="M12 12c3 0 5-2 5-5-3 0-5 2-5 5z"/><path d="M8 21h8"/>',
    song: '<path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
    laugh: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4.5 4.5 0 0 0 8 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
    hands: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/>',
    phrase: '<path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9h8M8 12h5"/>',
    car: '<path d="M3 14l2-6h14l2 6v4H3v-4z"/><path d="M3 14h18M7 18v2M17 18v2"/>',
    animal: '<circle cx="7" cy="11" r="1.6"/><circle cx="12" cy="7.5" r="1.6"/><circle cx="17" cy="11" r="1.6"/><path d="M12 12.5c3 0 5 2 5 4 0 2-2 2-5 1-3 1-5 1-5-1 0-2 2-4 5-4z"/>',
    water: '<path d="M3 9c3-3 6 3 9 0s6 3 9 0"/><path d="M3 15c3-3 6 3 9 0s6 3 9 0"/>',
    sunday: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    coat: '<path d="M12 6a2 2 0 1 1 2 2l-2 1.5"/><path d="M12 9.5L3 15a1 1 0 0 0 .6 1.8h16.8A1 1 0 0 0 21 15l-9-5.5z"/>',
    photo: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
    recipe: '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    writing: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
    chair: '<path d="M7 4v16"/><path d="M7 14h11v6"/><path d="M7 10h8"/>'
  };
  var KEEPS = [
    ['tea', 'A cup of tea'], ['kitchen', 'Their kitchen'], ['garden', 'The garden'], ['song', 'A song they loved'],
    ['laugh', 'Their laugh'], ['hands', 'Their hands'], ['phrase', 'A phrase they said'], ['car', 'Car rides'],
    ['animal', 'A beloved animal'], ['water', 'Sea or river'], ['sunday', 'Sunday gatherings'], ['coat', 'A coat or scarf'],
    ['photo', 'An old photograph'], ['recipe', 'A recipe'], ['writing', 'Their handwriting'], ['chair', 'A favourite chair']
  ];
  var RELS = [['parent', 'A parent'], ['grandparent', 'A grandparent'], ['partner', 'A partner'], ['child', 'A child'], ['sibling', 'A sibling'], ['friend', 'A friend'], ['pet', 'A pet'], ['other', 'Someone else']];
  var WHEN = [['fresh', 'Very recent'], ['months', 'A few months ago'], ['years', 'A year or more'], ['anniversary', 'An anniversary is near']];
  var FORMS = [
    ['letter', 'An unsent letter', 'A first-person letter to them, from you. Nothing comes back.'],
    ['hold', 'Words to hold', 'A short reflection on what these keepsakes may carry for you.'],
    ['ritual', 'A small ritual', 'Three to five gentle steps for the day, about fifteen minutes.']
  ];
  var MAXK = 4;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icon(id) { return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[id] + '</svg>'; }

  var params = new URLSearchParams(location.search);
  var pre = params.get('medium');
  var voices = cfg.voices;
  var state = { voice: voices.some(function (v) { return v.slug === pre; }) ? pre : voices[0].slug, relation: '', when: '', keeps: [], form: 'letter', busy: false };

  function radioGroup(name, items, cls) {
    return items.map(function (it) {
      return '<label class="rl-chip ' + cls + '"><input type="radio" name="' + name + '" value="' + it[0] + '"><span>' + esc(it[1]) + '</span></label>';
    }).join('');
  }

  root.innerHTML =
    '<div class="rl-badge" role="note"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>' +
    '<span><strong>AI reflection.</strong> Written by software to help you remember. It is not a message from anyone who has died, not a reading, and not a live medium.</span></div>' +
    '<div class="rl-desk">' +
    '<form class="rl-form" novalidate>' +
    '<fieldset class="rl-step"><legend><span class="rl-num">1</span>Choose a gentle voice</legend>' +
    '<div class="rl-voices" role="radiogroup">' + voices.map(function (v) {
      return '<label class="rl-voice"><input type="radio" name="voice" value="' + v.slug + '"' + (v.slug === state.voice ? ' checked' : '') + '>' +
        '<img src="' + esc(v.avatar) + '" alt="" width="56" height="56" loading="lazy"><span class="rl-vname">' + esc(v.first) + '</span><span class="rl-vrole">' + esc(v.short) + '</span></label>';
    }).join('') + '</div><p class="rl-hint" id="rl-vhint"></p></fieldset>' +
    '<fieldset class="rl-step"><legend><span class="rl-num">2</span>Who are you remembering?</legend>' +
    '<div class="rl-chips">' + radioGroup('relation', RELS, 'rl-rel') + '</div>' +
    '<div class="rl-row"><div class="rl-field"><label for="rl-name">Their first name (optional)</label><input id="rl-name" class="input" type="text" maxlength="30" autocomplete="off" placeholder="e.g. Margaret"></div></div>' +
    '<p class="rl-label">How long ago?</p><div class="rl-chips">' + radioGroup('when', WHEN, 'rl-when') + '</div></fieldset>' +
    '<fieldset class="rl-step"><legend><span class="rl-num">3</span>Pick up to four keepsakes <span class="rl-count" id="rl-kc">0 of 4</span></legend>' +
    '<div class="rl-shelf">' + KEEPS.map(function (k) {
      return '<button type="button" class="rl-keep" data-k="' + k[0] + '" aria-pressed="false">' + icon(k[0]) + '<span>' + esc(k[1]) + '</span></button>';
    }).join('') + '</div></fieldset>' +
    '<fieldset class="rl-step"><legend><span class="rl-num">4</span>One memory, if you would like <span class="rl-count">optional</span></legend>' +
    '<div class="rl-field"><label for="rl-mem" class="rl-sr">A memory</label><textarea id="rl-mem" class="input" maxlength="300" rows="3" placeholder="e.g. She hummed while she watered the tomatoes, always slightly off key."></textarea><span class="rl-count" id="rl-mc">0 / 300</span></div>' +
    '<p class="rl-hint">Please leave out surnames, addresses and contact details.</p></fieldset>' +
    '<fieldset class="rl-step"><legend><span class="rl-num">5</span>What would help today?</legend>' +
    '<div class="rl-forms">' + FORMS.map(function (f, i) {
      return '<label class="rl-form-opt"><input type="radio" name="form" value="' + f[0] + '"' + (i === 0 ? ' checked' : '') + '><span class="rl-fo-t">' + esc(f[1]) + '</span><span class="rl-fo-d">' + esc(f[2]) + '</span></label>';
    }).join('') + '</div></fieldset>' +
    '<p class="rl-error" id="rl-err" role="alert" hidden></p>' +
    '<button type="submit" class="btn btn-primary rl-go" data-nebula-preserve="1">Write it for me</button>' +
    '</form>' +
    '<aside class="rl-side">' +
    '<div class="rl-paper-wrap"><div class="rl-paper" id="rl-paper" aria-live="polite">' +
    '<div class="rl-empty"><svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 56V30"/><path d="M32 34c-8 0-13-5-13-13 8 0 13 5 13 13z"/><path d="M32 28c7 0 12-4 12-11-7 0-12 4-12 11z"/></svg>' +
    '<p>Your page will appear here. Take as long as you like with the choices on the left; nothing is saved on this device.</p></div></div>' +
    '<div class="rl-actions" id="rl-actions" hidden>' +
    '<button type="button" class="btn btn-secondary" id="rl-copy">Copy text</button>' +
    '<button type="button" class="btn btn-secondary" id="rl-print">Print or save</button>' +
    '<button type="button" class="btn btn-ghost" id="rl-other">Try another form</button></div></div>' +
    '<div class="rl-support"><h3>If today feels heavy</h3>' +
    '<p>You do not have to carry grief alone. These services are free and run by people, not software.</p>' +
    '<ul>' +
    '<li><strong>United States:</strong> call or text <a href="tel:988">988</a>, the Suicide &amp; Crisis Lifeline, any time.</li>' +
    '<li><strong>United Kingdom and Ireland:</strong> Samaritans on <a href="tel:116123">116 123</a>. Cruse Bereavement Support on <a href="tel:08088081677">0808 808 1677</a> (UK).</li>' +
    '<li><strong>Australia:</strong> Lifeline on <a href="tel:131114">13 11 14</a>.</li>' +
    '<li><a href="https://www.compassionatefriends.org/" rel="noopener" target="_blank">The Compassionate Friends</a> and <a href="https://findahelpline.com/" rel="noopener" target="_blank">Find a Helpline</a> list support in many countries.</li>' +
    '</ul><p class="rl-fine">If you are in immediate danger, contact your local emergency number. See also our <a href="/bereavement-support/">bereavement support page</a>.</p></div>' +
    '</aside></div>';

  var form = root.querySelector('.rl-form');
  var paper = document.getElementById('rl-paper');
  var actions = document.getElementById('rl-actions');
  var errEl = document.getElementById('rl-err');
  var go = root.querySelector('.rl-go');
  var lastText = '';

  function voiceObj() { return voices.filter(function (v) { return v.slug === state.voice; })[0]; }
  function setHint() { var v = voiceObj(); document.getElementById('rl-vhint').textContent = v.hint; }
  setHint();

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'voice') { state.voice = t.value; setHint(); }
    if (t.name === 'relation') state.relation = t.value;
    if (t.name === 'when') state.when = t.value;
    if (t.name === 'form') state.form = t.value;
    errEl.hidden = true;
  });
  form.querySelector('.rl-shelf').addEventListener('click', function (e) {
    var b = e.target.closest('.rl-keep');
    if (!b) return;
    var k = b.getAttribute('data-k');
    var i = state.keeps.indexOf(k);
    if (i >= 0) { state.keeps.splice(i, 1); }
    else if (state.keeps.length < MAXK) { state.keeps.push(k); }
    else { flash('You can pick up to four. Tap a chosen one to put it back.'); return; }
    form.querySelectorAll('.rl-keep').forEach(function (x) {
      var on = state.keeps.indexOf(x.getAttribute('data-k')) >= 0;
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
      x.classList.toggle('on', on);
    });
    document.getElementById('rl-kc').textContent = state.keeps.length + ' of ' + MAXK;
    errEl.hidden = true;
  });
  var mem = document.getElementById('rl-mem');
  mem.addEventListener('input', function () { document.getElementById('rl-mc').textContent = mem.value.length + ' / 300'; });
  // Голос з URL (?medium=slug) відмічено у розмітці.

  function flash(msg) { errEl.textContent = msg; errEl.hidden = false; }

  function renderText(text, form) {
    var paras = text.split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean);
    return paras.map(function (p, i) {
      var h = esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      return '<p' + (form === 'letter' && i === 0 ? ' class="rl-salute"' : '') + '>' + h + '</p>';
    }).join('');
  }

  function fail(msg) {
    paper.innerHTML = '<div class="rl-empty rl-failed"><p>' + esc(msg) + '</p><button type="button" class="btn btn-secondary" id="rl-retry">Try again</button></div>';
    document.getElementById('rl-retry').addEventListener('click', function () { form.requestSubmit(); });
    actions.hidden = true;
    state.busy = false; go.disabled = false; go.textContent = 'Write it for me';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.busy) return;
    if (!state.relation) return flash('Please choose who you are remembering.');
    if (!state.when) return flash('Please choose how long ago it was.');
    var memory = mem.value.trim();
    if (!state.keeps.length && memory.length < 10) return flash('Pick at least one keepsake, or write a short memory.');
    var payload = { voice: state.voice, relation: state.relation, when: state.when, name: document.getElementById('rl-name').value.trim(),
      keepsakes: state.keeps.slice(), memory: memory, form: state.form };
    state.busy = true; go.disabled = true; go.textContent = 'Writing…';
    errEl.hidden = true;
    actions.hidden = true;
    var v = voiceObj();
    paper.innerHTML = '<div class="rl-sheet"><div class="rl-text" id="rl-text"></div><p class="rl-sign">AI-written in the gentle style of ' + esc(v.first) + '’s approach. Not from ' + esc(v.first) + ', and not a message from anyone who has died.</p></div>';
    paper.classList.add('has-text');
    if (window.matchMedia('(max-width: 900px)').matches) paper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var full = '', cut = false, box = document.getElementById('rl-text');
    box.innerHTML = '<span class="rl-dots"><i></i><i></i><i></i></span>';
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || 'The letter desk is unavailable right now. Please try again in a moment.'); });
      }
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          buf += dec.decode(r.value, { stream: true });
          var lines = buf.split('\n'); buf = lines.pop();
          lines.forEach(function (ln) {
            ln = ln.trim();
            if (ln.indexOf('data:') !== 0) return;
            var d = ln.slice(5).trim();
            if (d === '[DONE]') return;
            try { var j = JSON.parse(d); if (typeof j.t === 'string') full += j.t; if (j.cut) cut = true; } catch (x) { /* неповний рядок */ }
          });
          box.innerHTML = renderText(full, payload.form);
          return pump();
        });
      }
      return pump();
    }).then(function () {
      if (cut || !full.trim()) throw new Error('This page was cut short. Please try again for a complete one.');
      lastText = box.innerText;
      actions.hidden = false;
      state.busy = false; go.disabled = false; go.textContent = 'Write another';
    }).catch(function (err) {
      fail(err && err.message ? err.message : 'The letter desk is unavailable right now.');
    });
  });

  document.getElementById('rl-copy').addEventListener('click', function () {
    var b = this;
    var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy text'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lastText).then(done, function () { b.textContent = 'Select and copy'; });
    else b.textContent = 'Select and copy';
  });
  document.getElementById('rl-print').addEventListener('click', function () { window.print(); });
  document.getElementById('rl-other').addEventListener('click', function () {
    var f = form.querySelector('.rl-forms');
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var inp = f.querySelector('input:checked + .rl-fo-t'); if (inp) inp.focus && inp.focus();
  });
})();
