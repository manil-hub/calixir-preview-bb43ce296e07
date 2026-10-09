/* ------------------------------------------------------------------
   Calixir Paris — logique du site
   Carte → sélection → demande de devis (livraison, coordonnées) → envoi.
   Aucune dépendance. Les données viennent de data.js.
------------------------------------------------------------------- */
(function () {
  'use strict';

  const C = window.CAL;
  const cfg = C.config;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur = n => fmt.format(n).replace(/[  ]/g, ' ') + ' €';
  const eurTxt = n => eur(n).replace(/ /g, ' ');
  const hid = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'k' + (h >>> 0).toString(36); };

  const ICON = {
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  const byId = new Map(C.products.map(p => [p.id, p]));
  const groupById = new Map(C.groups.map(g => [g.id, g]));
  const tabOf = p => groupById.get(p.group).tab;

  /* ---------- Stockage (tolérant : navigation privée, file://, etc.) ---------- */
  const store = {
    read() { try { return JSON.parse(localStorage.getItem(cfg.storageKey)) || {}; } catch (e) { return {}; } },
    write(o) { try { localStorage.setItem(cfg.storageKey, JSON.stringify(o)); } catch (e) { /* ignoré */ } }
  };
  const saved = store.read();
  let cart = Array.isArray(saved.cart) ? saved.cart.filter(l => l && byId.has(l.id) && l.qty > 0 && l.opts && typeof l.opts === 'object') : [];
  let form = saved.form && typeof saved.form === 'object' ? saved.form : {};
  const persist = () => store.write({ cart, form });

  /* ---------- Panier ---------- */
  const optsKey = o => JSON.stringify(Object.keys(o).sort().map(k => [k, Array.isArray(o[k]) ? o[k].slice().sort() : o[k]]));
  const lineKey = (id, opts) => id + '::' + optsKey(opts);
  cart.forEach(l => { l.key = lineKey(l.id, l.opts); });
  const findLine = key => cart.find(l => l.key === key);
  const qtyOf = id => cart.filter(l => l.id === id).reduce((n, l) => n + l.qty, 0);

  function addLine(id, opts, qty) {
    const key = lineKey(id, opts);
    const l = findLine(key);
    if (l) l.qty = Math.min(999, l.qty + qty); else cart.push({ key, id, opts, qty });
    changed([id]);
  }
  function setQty(key, qty) {
    const l = findLine(key); if (!l) return;
    qty = Math.max(0, Math.min(999, Math.floor(Number(qty)) || 0));
    if (qty === 0) cart = cart.filter(x => x.key !== key); else l.qty = qty;
    changed([l.id]);
  }
  function totals() {
    let count = 0, total = 0, hasFrom = false, unpriced = false;
    cart.forEach(l => {
      const p = byId.get(l.id); count += l.qty;
      if (p.price == null) unpriced = true; else total += p.price * l.qty;
      if (p.from) hasFrom = true;
    });
    return { count, total, hasFrom, unpriced, lines: cart.length };
  }
  function needs72() {
    return cart.some(l => {
      const p = byId.get(l.id);
      if (p.lead72) return true;
      return (p.options || []).some(o => (o.choices || []).some(c => c.lead72 && [].concat(l.opts[o.key] || []).includes(c.v)));
    });
  }
  const describeOpts = (p, opts) => (p.options || []).map(o => {
    const v = [].concat(opts[o.key] || []); if (!v.length) return null;
    return o.label.replace(/\s*\(.*\)/, '') + ' : ' + v.join(', ');
  }).filter(Boolean);

  /* ---------- Rendu : éléments communs ---------- */
  const priceHTML = p => p.price == null
    ? '<span class="price"><b>Sur devis</b></span>'
    : `<span class="price">${p.from ? '<small class="from">à partir de</small>' : ''}<b>${eur(p.price)}</b><small>HT${p.unit ? ' / ' + esc(p.unit) : ''}</small></span>`;
  const tagsHTML = p => (p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
  const leadHTML = p => p.lead72 ? `<span class="lead72" title="À commander 72 h à l’avance">${ICON.clock}Commande 72 h avant</span>` : '';

  function stepperHTML(key, qty, sm, prefix) {
    const k = esc(key), f = hid(key);
    return `<div class="stepper${sm ? ' sm' : ''}" role="group" aria-label="Quantité">
      <button type="button" data-action="${prefix}dec" data-key="${k}" data-fid="dec-${f}" aria-label="Retirer un">${ICON.minus}</button>
      <input type="number" min="0" max="999" inputmode="numeric" value="${qty}" data-action="${prefix}qty" data-key="${k}" data-fid="qty-${f}" aria-label="Quantité">
      <button type="button" data-action="${prefix}inc" data-key="${k}" data-fid="inc-${f}" aria-label="Ajouter un">${ICON.plus}</button>
    </div>`;
  }
  function controlHTML(p) {
    const hasChoice = !!(p.options && p.options.length);
    if (hasChoice) return `<button type="button" class="add-btn" data-action="open-product" data-id="${p.id}" data-fid="add-${p.id}">${ICON.plus}Choisir</button>`;
    const key = lineKey(p.id, {}), l = findLine(key);
    if (l) return stepperHTML(key, l.qty, false, '');
    return `<button type="button" class="add-btn" data-action="quick-add" data-id="${p.id}" data-fid="add-${p.id}">${ICON.plus}Ajouter</button>`;
  }
  const hasDetail = p => !!(p.options || p.items || p.details || p.note);

  function cardHTML(p) {
    const g = groupById.get(p.group), img = p.img || g.img, q = qtyOf(p.id);
    const teaser = (p.items || []).join(' · ');
    return `<article class="card" data-id="${p.id}">
      <div class="card-media">${img ? `<img src="assets/img/${img}.jpg" alt="" loading="lazy">` : '<div class="noimg"></div>'}${q ? `<span class="in-cart">${q} dans ma demande</span>` : ''}</div>
      <div class="card-body">
        <h4 class="card-title"><button type="button" data-action="open-product" data-id="${p.id}">${esc(p.name)}</button></h4>
        ${p.sub ? `<p class="card-sub">${esc(p.sub)}</p>` : ''}
        ${teaser ? `<p class="card-teaser">${esc(teaser)}</p>` : ''}
        ${(p.tags || p.lead72) ? `<div class="meta">${tagsHTML(p)}${leadHTML(p)}</div>` : ''}
        <div class="card-foot">${priceHTML(p)}<div class="ctrl">${controlHTML(p)}</div></div>
      </div></article>`;
  }
  function rowHTML(p) {
    const q = qtyOf(p.id);
    const name = hasDetail(p) ? `<button type="button" data-action="open-product" data-id="${p.id}">${esc(p.name)}</button>` : esc(p.name);
    return `<li class="row" data-id="${p.id}">
      <div class="row-info"><div class="row-name">${name}</div>${p.sub ? `<p class="row-sub">${esc(p.sub)}</p>` : ''}${tagsHTML(p)}${q && p.options ? `<span class="in-cart-inline">${q} dans ma demande</span>` : ''}</div>
      <div class="row-act">${priceHTML(p)}<div class="ctrl">${controlHTML(p)}</div></div></li>`;
  }
  const productHTML = p => groupById.get(p.group).layout === 'rows' ? rowHTML(p) : cardHTML(p);

  /* ---------- Catalogue ---------- */
  let currentTab = C.tabs[0].id;

  function renderTabs() {
    const counts = {};
    cart.forEach(l => { const t = tabOf(byId.get(l.id)); counts[t] = (counts[t] || 0) + 1; });
    $('#tabs').innerHTML = C.tabs.map(t => `<button type="button" role="tab" class="tab" id="tab-${t.id}" data-action="tab" data-tab="${t.id}" aria-selected="${t.id === currentTab}" aria-controls="catalog" tabindex="${t.id === currentTab ? 0 : -1}">${esc(t.label)}${counts[t.id] ? `<span class="dot" aria-label="${counts[t.id]} sélection(s)">${counts[t.id]}</span>` : ''}</button>`).join('');
  }
  function renderCatalog() {
    const groups = C.groups.filter(g => g.tab === currentTab);
    const html = groups.map(g => {
      const items = C.products.filter(p => p.group === g.id);
      const head = `<div class="group-head">${g.eyebrow ? `<p class="eyebrow">${esc(g.eyebrow)}</p>` : ''}<h3 id="g-${g.id}">${esc(g.title)}</h3>${g.intro ? `<p class="intro">${esc(g.intro)}</p>` : ''}</div>`;
      let body;
      if (g.layout === 'rows') {
        body = `<div class="rows-wrap${g.img ? ' has-media' : ''}">${g.img ? `<div class="rows-media"><img src="assets/img/${g.img}.jpg" alt="" loading="lazy"></div>` : ''}<ul class="rows">${items.map(rowHTML).join('')}</ul></div>`;
      } else {
        body = `<div class="cards">${items.map(cardHTML).join('')}</div>`;
      }
      return `<section class="group" aria-labelledby="g-${g.id}">${head}${body}${g.note ? `<p class="group-note">${esc(g.note)}</p>` : ''}</section>`;
    }).join('');
    const others = ['douceurs', 'boissons'].filter(t => t !== currentTab && C.tabs.some(x => x.id === t));
    const hint = currentTab === 'boissons' ? '' :
      `<div class="hint-box">Pensez à compléter votre commande : ${others.map(t => `<button type="button" class="link-btn" data-action="goto-tab" data-tab="${t}">${esc(C.tabs.find(x => x.id === t).label)}</button>`).join(' · ')}</div>`;
    $('#catalog').innerHTML = html + hint;
    $('#catalog').setAttribute('aria-labelledby', 'tab-' + currentTab);
  }
  function selectTab(id, opts) {
    if (!C.tabs.some(t => t.id === id)) id = C.tabs[0].id;
    currentTab = id;
    renderTabs(); renderCatalog();
    try { history.replaceState(null, '', '#carte-' + id); } catch (e) { /* file:// */ }
    const sel = $('#tab-' + id); if (sel && sel.scrollIntoView) sel.scrollIntoView({ inline: 'center', block: 'nearest' });
    if (opts && opts.focus) sel.focus({ preventScroll: true });
    const top = $('#catalog').getBoundingClientRect().top + window.scrollY - $('.site-header').offsetHeight - $('#tabsBar').offsetHeight - 8;
    if (!(opts && opts.noScroll) && window.scrollY > top) window.scrollTo({ top, behavior: 'auto' });
  }

  /* ---------- Rafraîchissement ciblé après changement du panier ---------- */
  function restoreFocus(fid) {
    if (!fid) return;
    const el = document.querySelector(`[data-fid="${fid}"]`);
    if (el) el.focus({ preventScroll: true });
  }
  function changed(ids) {
    persist();
    const fid = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fid : null;
    (ids || []).forEach(id => {
      const p = byId.get(id); if (!p) return;
      const old = $(`#catalog [data-id="${id}"].card, #catalog [data-id="${id}"].row`);
      if (!old) return;
      const tpl = document.createElement('template'); tpl.innerHTML = productHTML(p).trim();
      old.replaceWith(tpl.content.firstElementChild);
    });
    const t = totals();
    $('#headerCount').hidden = t.count === 0; $('#headerCount').textContent = t.count;
    const bar = $('#cartBar');
    bar.hidden = t.count === 0 || $('#quoteDialog').open;
    document.body.classList.toggle('has-bar', !bar.hidden);
    $('#barCount').textContent = t.count + (t.count > 1 ? ' articles' : ' article');
    $('#barTotal').textContent = totalLabel(t);
    renderTabs();
    if ($('#quoteDialog').open && step === 1) renderStep1();
    refreshFoot();
    restoreFocus(fid);
  }
  function totalLabel(t) {
    if (t.total === 0 && t.unpriced) return 'Sur devis';
    return (t.hasFrom || t.unpriced ? 'dès ' : '') + eur(t.total) + ' HT';
  }

  /* ---------- Dialogues ---------- */
  function openDialog(d) { if (!d.open) d.showModal(); document.body.classList.add('lock'); }
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => {
      if (!$$('dialog').some(x => x.open)) document.body.classList.remove('lock');
      changed([]);
    });
  });
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
  }

  /* ---------- Fiche produit ---------- */
  let sheet = null; // { id, qty, opts }
  function openProduct(id) {
    const p = byId.get(id); if (!p) return;
    sheet = { id, qty: 1, opts: {} };
    const g = groupById.get(p.group), img = p.img || g.img;
    const body = `
      ${img ? `<div class="pd-media"><img src="assets/img/${img}.jpg" alt=""></div>` : '<div style="height:20px"></div>'}
      <div class="pd-body">
        <h2 id="pdTitle">${esc(p.name)}</h2>
        ${p.sub ? `<p class="pd-sub">${esc(p.sub)}</p>` : ''}
        <div class="pd-price">${p.price == null ? '<b>Sur devis</b>' : `<b>${eur(p.price)}</b><span>HT${p.from ? ' · à partir de' : ''}${p.unit ? ' · par ' + esc(p.unit) : ''}</span>`}</div>
        ${(p.tags || p.lead72) ? `<div class="pd-meta">${tagsHTML(p)}${leadHTML(p)}</div>` : ''}
        ${p.items ? `<div class="pd-list"><h4>${p.id.startsWith('plateau') || p.id === 'pause-box' || p.id === 'lunchbox' ? 'Comprend' : 'Composition'}</h4><ul>${p.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}
        ${p.note ? `<p class="pd-note">${esc(p.note)}</p>` : ''}
        ${(p.details || []).map(d => `<details class="pd-details"><summary>${esc(d.title)}</summary><ul>${d.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>`).join('')}
        ${(p.options || []).map(o => `
          <fieldset class="opt-group" data-opt="${o.key}">
            <legend>${esc(o.label)}${o.required ? '<span class="req">à choisir</span>' : ''}</legend>
            ${o.choices.map((c, i) => `<label class="tile"><input type="${o.type === 'check' ? 'checkbox' : 'radio'}" name="opt-${o.key}" value="${esc(c.v)}"><span class="tile-text">${esc(c.v)}${(c.sub || c.lead72) ? `<small>${esc([c.sub, c.lead72 ? 'commande 72 h avant' : ''].filter(Boolean).join(' · '))}</small>` : ''}</span></label>`).join('')}
            <p class="opt-error" hidden>Merci de faire un choix.</p>
          </fieldset>`).join('')}
      </div>`;
    $('#pdBody').innerHTML = body;
    $('#pdFoot').innerHTML = `${stepperHTML('sheet', 1, false, 'sheet-')}<button type="button" class="btn btn-primary" data-action="sheet-add" id="sheetAdd"></button>`;
    updateSheetBtn();
    $('#pdBody').scrollTop = 0;
    openDialog($('#productDialog'));
  }
  function updateSheetBtn() {
    const p = byId.get(sheet.id);
    const b = $('#sheetAdd'); if (!b) return;
    b.textContent = p.price == null ? 'Ajouter à ma demande' : `Ajouter · ${eur(p.price * sheet.qty)} HT`;
    $('#pdFoot input[data-action="sheet-qty"]').value = sheet.qty;
  }
  function addFromSheet() {
    const p = byId.get(sheet.id); let first = null;
    (p.options || []).forEach(o => {
      const fs = $(`.opt-group[data-opt="${o.key}"]`, $('#pdBody'));
      const vals = $$('input:checked', fs).map(i => i.value);
      const missing = o.required && vals.length === 0;
      fs.classList.toggle('has-error', missing); $('.opt-error', fs).hidden = !missing;
      if (missing && !first) first = fs;
      if (vals.length) sheet.opts[o.key] = o.type === 'check' ? vals : vals[0]; else delete sheet.opts[o.key];
    });
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    addLine(sheet.id, Object.assign({}, sheet.opts), sheet.qty);
    $('#productDialog').close();
    toast('Ajouté à votre demande');
  }

  /* ---------- Tiroir « Ma demande de devis » ---------- */
  let step = 1, sendMode = null, sendError = '';
  const STEPS = [1, 2, 3, 4];

  function openQuote(n) {
    $('#productDialog').open && $('#productDialog').close();
    sendMode = null; sendError = '';
    bindFormValues(); updateDateMin();
    goStep(n || 1, true);
    openDialog($('#quoteDialog'));
    $('#cartBar').hidden = true; document.body.classList.remove('has-bar');
  }
  function goStep(n, silent) {
    step = n;
    STEPS.forEach(s => { $('#qStep' + s).hidden = s !== n; });
    $$('#qProgress li').forEach(li => {
      const s = Number(li.dataset.step);
      li.classList.toggle('is-active', s === n); li.classList.toggle('is-done', s < n);
      if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('#qProgress').classList.toggle('is-hidden', n === 4);
    if (n === 1) renderStep1();
    if (n === 4) renderStep4();
    refreshFoot();
    $('#qBody').scrollTop = 0;
    if (!silent) { const h = $('#qStep' + n + ' .step-title, #qStep' + n + ' h3'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
  }

  function renderStep1() {
    const el = $('#qStep1'), t = totals();
    if (!cart.length) {
      el.innerHTML = `<div class="empty"><h3>Votre demande est vide</h3><p>Ajoutez des plateaux, coffrets ou boissons depuis la carte pour préparer votre devis.</p><button type="button" class="btn btn-primary" data-action="close-dialog">Parcourir la carte</button></div>`;
      return;
    }
    el.innerHTML = `
      <h3 class="step-title">Votre sélection</h3>
      <ul class="lines">${cart.map(l => {
        const p = byId.get(l.id), opts = describeOpts(p, l.opts);
        return `<li class="line">
          <div><div class="line-name">${esc(p.name)}${p.sub && p.group !== 'lunchbag' ? ` <span class="line-unit">· ${esc(p.sub)}</span>` : ''}</div>
            ${opts.length ? `<p class="line-opts">${opts.map(esc).join('<br>')}</p>` : ''}
            <span class="line-unit">${p.price == null ? 'Prix sur devis' : (p.from ? 'à partir de ' : '') + eur(p.price) + ' HT l’unité'}</span></div>
          <div class="line-total">${p.price == null ? '—' : eur(p.price * l.qty)}</div>
          <div class="line-ctrl">${stepperHTML(l.key, l.qty, true, 'line-')}<button type="button" class="line-del" data-action="line-remove" data-key="${esc(l.key)}">Retirer</button></div>
        </li>`;
      }).join('')}</ul>
      <div class="total-box">
        <div class="total-row"><span>Estimation ${t.hasFrom || t.unpriced ? '(prix de départ)' : ''}</span><b>${totalLabel(t)}</b></div>
        <p>Estimation indicative hors frais de livraison et TVA. Calixir vous envoie un devis définitif, avec les frais de livraison selon votre adresse.</p>
      </div>
      <button type="button" class="btn btn-ghost add-more" data-action="close-dialog">+ Ajouter d’autres produits</button>`;
  }

  function refreshFoot() {
    const f = $('#qFoot'); if (!f) return;
    const t = totals();
    const est = `<div class="est"><span>Estimation HT</span><b>${totalLabel(t)}</b></div>`;
    if (step === 1) f.innerHTML = cart.length ? `${est}<span class="grow"></span><button type="button" class="btn btn-primary" data-action="next">Continuer</button>` : '<span class="grow"></span>';
    else if (step === 2) f.innerHTML = `<button type="button" class="btn btn-ghost" data-action="back">Retour</button>${est}<span class="grow"></span><button type="button" class="btn btn-primary" data-action="next">Continuer</button>`;
    else if (step === 3) f.innerHTML = `<button type="button" class="btn btn-ghost" data-action="back">Retour</button>${est}<span class="grow"></span><button type="button" class="btn btn-primary" data-action="send" id="sendBtn">${cfg.endpoint ? 'Envoyer ma demande' : 'Valider ma demande'}</button>`;
    else f.innerHTML = sendMode === 'endpoint'
      ? '<span class="grow"></span><button type="button" class="btn btn-primary" data-action="finish">Terminer</button>'
      : '<button type="button" class="btn btn-ghost" data-action="back-edit">Modifier ma demande</button><span class="grow"></span><button type="button" class="btn btn-ghost" data-action="close-dialog">Fermer</button>';
  }

  /* ----- Formulaires : valeurs, validation ----- */
  function bindFormValues() {
    $$('#qStep2 [name], #qStep3 [name]').forEach(el => {
      const v = form[el.name];
      if (el.type === 'checkbox' && el.name === 'diet') el.checked = Array.isArray(v) && v.includes(el.value);
      else if (el.type === 'checkbox') el.checked = el.name === 'consent' ? false : !!v;
      else el.value = v == null ? '' : v;
    });
    $('#billingField').hidden = !$('#f-billDiff').checked;
    $$('.has-error').forEach(f => f.classList.remove('has-error'));
    $$('.form .error').forEach(e => e.remove());
  }
  function readField(el) {
    if (el.name === 'diet') form.diet = $$('#qStep2 input[name="diet"]:checked').map(i => i.value);
    else if (el.type === 'checkbox') { if (el.name !== 'consent') form[el.name] = el.checked; }
    else if (el.name !== 'website') form[el.name] = el.value;
    persist();
  }
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  function updateDateMin() {
    const min = startOfToday(); min.setDate(min.getDate() + 1);
    $('#f-date').min = ymd(min);
    updateDateHint();
  }
  function updateDateHint() {
    const hint = $('#dateHint'), v = $('#f-date').value; const msgs = [];
    if (v) {
      const today = startOfToday(), d = parseYmd(v), diff = Math.round((d - today) / 864e5);
      if (needs72() && diff < 3) msgs.push('Certains produits de votre sélection se commandent 72 h à l’avance : Calixir vous confirmera si cette date est possible.');
      const dow = today.getDay();
      if (dow === 6 || dow === 0) {
        const monday = new Date(today); monday.setDate(monday.getDate() + (dow === 6 ? 2 : 1));
        if (d <= monday) msgs.push('Les commandes ne sont pas prises le week-end pour une livraison du même week-end ou du lundi suivant. Appelez-nous au ' + cfg.phone + '.');
      }
    }
    hint.hidden = !msgs.length; hint.className = 'hint' + (msgs.length ? ' warn' : ''); hint.textContent = msgs.join(' ');
  }
  function fieldError(el, msg) {
    const wrap = el.closest('.field'); if (!wrap) return;
    wrap.classList.add('has-error');
    let p = wrap.querySelector('.error');
    if (!p) { p = document.createElement('p'); p.className = 'error'; p.id = 'err-' + (el.id || el.name); el.insertAdjacentElement('afterend', p); }
    p.textContent = msg; el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', p.id);
  }
  function clearError(el) {
    const wrap = el.closest('.field'); if (!wrap) return;
    wrap.classList.remove('has-error'); const p = wrap.querySelector('.error'); if (p) p.remove();
    el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby');
  }
  function validateSection(sel) {
    let first = null;
    $$(`${sel} [required]`).forEach(el => {
      clearError(el);
      let msg = '';
      const v = el.validity;
      if (el.type === 'checkbox') { if (!el.checked) msg = 'Merci de cocher cette case pour continuer.'; }
      else if (v.valueMissing) msg = 'Ce champ est obligatoire.';
      else if (v.typeMismatch && el.type === 'email') msg = 'Adresse e-mail invalide.';
      else if (v.patternMismatch && el.name === 'zip') msg = 'Code postal à 5 chiffres.';
      else if (v.rangeUnderflow && el.type === 'date') msg = 'Choisissez une date à partir de demain.';
      else if (v.rangeUnderflow) msg = 'Indiquez au moins 1.';
      else if (!v.valid) msg = 'Valeur invalide.';
      if (!msg && el.name === 'timeTo' && $('#f-timeFrom').value && el.value <= $('#f-timeFrom').value) msg = 'L’heure de fin doit être après l’heure de début.';
      if (!msg && el.name === 'phone' && el.value.replace(/\D/g, '').length < 8) msg = 'Numéro de téléphone invalide.';
      if (msg) { fieldError(el, msg); if (!first) first = el; }
    });
    if (first) first.focus();
    return !first;
  }

  /* ----- Récapitulatif ----- */
  const longDate = s => parseYmd(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function buildRecap() {
    const t = totals();
    const lines = cart.map(l => {
      const p = byId.get(l.id);
      return { qty: l.qty, name: p.name + (p.sub && p.group !== 'lunchbag' ? ' (' + p.sub + ')' : ''), options: describeOpts(p, l.opts), unit: p.price, from: !!p.from, total: p.price == null ? null : p.price * l.qty };
    });
    const who = [form.firstName, form.lastName].filter(Boolean).join(' ');
    const out = [];
    out.push('DEMANDE DE DEVIS · Calixir Paris (offre livrée sans service)', '');
    out.push('CONTACT');
    out.push('Nom : ' + who + (form.company ? ' · ' + form.company : ''));
    out.push('E-mail : ' + (form.email || '')); out.push('Téléphone : ' + (form.phone || ''));
    if (form.billDiff && form.billing) out.push('Facturation : ' + form.billing.replace(/\s*\n\s*/g, ', '));
    out.push('', 'LIVRAISON');
    out.push('Date : ' + (form.date ? longDate(form.date) : ''));
    out.push('Créneau souhaité : de ' + (form.timeFrom || '') + ' à ' + (form.timeTo || ''));
    out.push('Convives : ' + (form.guests || ''));
    out.push('Adresse : ' + [form.address, [form.zip, form.city].filter(Boolean).join(' ')].filter(Boolean).join(', '));
    if (form.access) out.push('Accès : ' + form.access.replace(/\s*\n\s*/g, ' / '));
    if (form.diet && form.diet.length) out.push('Régimes : ' + form.diet.join(', '));
    if (form.notes) out.push('Précisions : ' + form.notes.replace(/\s*\n\s*/g, ' / '));
    out.push('', 'SÉLECTION');
    const selection = lines.map(l => {
      let s = '• ' + l.qty + ' × ' + l.name;
      if (l.options.length) s += '\n    ' + l.options.join('\n    ');
      s += '\n    ' + (l.unit == null ? 'Prix sur devis' : (l.from ? 'à partir de ' : '') + eurTxt(l.unit) + ' HT l’unité' + ' → ' + eurTxt(l.total) + ' HT');
      return s;
    });
    const condensed = lines.map(l => '• ' + l.qty + ' × ' + l.name + (l.options.length ? ' [' + l.options.join(' ; ') + ']' : ''));
    out.push(...selection);
    const est = 'Estimation indicative : ' + (t.hasFrom || t.unpriced ? 'dès ' : '') + eurTxt(t.total) + ' HT (hors livraison et TVA)';
    out.push('', est, '', 'Demande envoyée depuis le site Calixir Paris.');
    const head = out.slice(0, out.indexOf('SÉLECTION') + 1);
    return {
      text: out.join('\n'),
      short: [...head, ...condensed, '', est].join('\n'),
      lines, estimate: t, who
    };
  }
  function mailtoHref(r) {
    const subject = `Demande de devis · ${r.who}${form.company ? ' (' + form.company + ')' : ''} · livraison du ${form.date ? parseYmd(form.date).toLocaleDateString('fr-FR') : ''}`;
    const make = body => `mailto:${cfg.toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    let href = make(r.text), truncated = false;
    if (href.length > 1900) { href = make(r.short); truncated = true; }
    if (href.length > 1900) { href = make(r.short.slice(0, 900) + '\n[…] Récapitulatif complet copié : collez-le ici.'); truncated = true; }
    return { href, truncated };
  }
  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
      try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e2) { return false; }
    }
  }
  function printRecap() {
    const r = buildRecap(), t = r.estimate;
    $('#printArea').innerHTML = `<img src="assets/img/logo-horizontal.png" alt="Calixir Paris"><h1>Demande de devis</h1>
      <p>${esc(r.who)}${form.company ? ' · ' + esc(form.company) : ''}<br>${esc(form.email || '')} · ${esc(form.phone || '')}</p>
      <h2>Livraison</h2><p>${esc(form.date ? longDate(form.date) : '')}, de ${esc(form.timeFrom || '')} à ${esc(form.timeTo || '')} · ${esc(form.guests || '')} convives<br>${esc([form.address, [form.zip, form.city].filter(Boolean).join(' ')].filter(Boolean).join(', '))}${form.access ? '<br>' + esc(form.access) : ''}${form.diet && form.diet.length ? '<br>Régimes : ' + esc(form.diet.join(', ')) : ''}${form.notes ? '<br>' + esc(form.notes) : ''}</p>
      <h2>Sélection</h2><table>${r.lines.map(l => `<tr><td>${l.qty} × ${esc(l.name)}${l.options.length ? '<br><small>' + l.options.map(esc).join(' · ') + '</small>' : ''}</td><td>${l.total == null ? 'sur devis' : eurTxt(l.total) + ' HT'}</td></tr>`).join('')}</table>
      <p><strong>Estimation indicative : ${t.hasFrom || t.unpriced ? 'dès ' : ''}${eurTxt(t.total)} HT</strong> (hors livraison et TVA)</p>`;
    window.print();
  }

  function renderStep4() {
    const r = buildRecap();
    const el = $('#qStep4');
    if (sendMode === 'endpoint') {
      el.innerHTML = `<div class="done"><span class="badge">${ICON.check}</span><h3>Demande envoyée</h3>
        <p>Merci ${esc(form.firstName || '')} ! Calixir a bien reçu votre demande et vous répondra par e-mail avec votre devis.</p>
        <div class="recap">${esc(r.text)}</div></div>`;
      return;
    }
    const { href, truncated } = mailtoHref(r);
    el.innerHTML = `<div class="done"><span class="badge">${ICON.check}</span><h3>Votre demande est prête</h3>
      <p>Il reste une étape : envoyez-la à Calixir par e-mail, le message est déjà rédigé.</p>
      ${sendError ? `<p class="send-error">${esc(sendError)}</p>` : ''}
      <div class="done-actions">
        <a class="btn btn-primary btn-lg" href="${esc(href)}" data-action="mail" data-truncated="${truncated}">Envoyer par e-mail</a>
        <button type="button" class="btn btn-ghost" data-action="copy">Copier le récapitulatif</button>
        <button type="button" class="btn btn-ghost" data-action="print">Imprimer / enregistrer en PDF</button>
      </div>
      <p class="muted" style="font-size:.88rem">Une question ? Appelez-nous au <a href="tel:${cfg.phoneHref}">${esc(cfg.phone)}</a> (${esc(cfg.hours)}).</p>
      <div class="recap">${esc(r.text)}</div></div>`;
  }

  async function send() {
    if (!validateSection('#qStep3')) return;
    $$('#qStep3 [name]').forEach(readField);
    if (form.website) { sendMode = 'endpoint'; return goStep(4); } // champ piège : on fait semblant
    sendError = '';
    if (!cfg.endpoint) { sendMode = 'mail'; return goStep(4); }
    const btn = $('#sendBtn'); btn.disabled = true; btn.textContent = 'Envoi en cours…';
    const r = buildRecap();
    const payload = {
      _subject: `Demande de devis · ${r.who} · livraison du ${form.date ? parseYmd(form.date).toLocaleDateString('fr-FR') : ''}`,
      email: form.email, name: r.who, company: form.company || '', phone: form.phone,
      delivery: { date: form.date, from: form.timeFrom, to: form.timeTo, guests: form.guests, address: form.address, zip: form.zip, city: form.city, access: form.access || '' },
      diet: form.diet || [], notes: form.notes || '', billing: form.billDiff ? form.billing : '',
      lines: r.lines, estimate: r.estimate, message: r.text
    };
    try {
      const res = await fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      sendMode = 'endpoint';
    } catch (e) {
      sendMode = 'mail'; sendError = 'L’envoi automatique n’a pas abouti. Vous pouvez transmettre votre demande par e-mail ci-dessous.';
    }
    goStep(4);
  }

  /* ---------- Événements ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action]'); if (!t) return;
    const a = t.dataset.action, key = t.dataset.key;
    switch (a) {
      case 'tab': selectTab(t.dataset.tab, { focus: true }); break;
      case 'goto-tab': selectTab(t.dataset.tab, { noScroll: true }); $('#tabsBar').scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'open-product': openProduct(t.dataset.id); break;
      case 'quick-add': addLine(t.dataset.id, {}, 1); break;
      case 'inc': case 'line-inc': setQty(key, findLine(key).qty + 1); break;
      case 'dec': case 'line-dec': setQty(key, findLine(key).qty - 1); break;
      case 'line-remove': setQty(key, 0); break;
      case 'sheet-inc': sheet.qty = Math.min(999, sheet.qty + 1); updateSheetBtn(); break;
      case 'sheet-dec': sheet.qty = Math.max(1, sheet.qty - 1); updateSheetBtn(); break;
      case 'sheet-add': addFromSheet(); break;
      case 'open-quote': openQuote(1); break;
      case 'open-cgv': openDialog($('#cgvDialog')); $('#cgvDialog .sheet-scroll').scrollTop = 0; break;
      case 'close-dialog': t.closest('dialog').close(); break;
      case 'next':
        if (step === 1) goStep(2);
        else if (step === 2 && validateSection('#qStep2')) { $$('#qStep2 [name]').forEach(readField); goStep(3); }
        break;
      case 'back': goStep(step - 1); break;
      case 'back-edit': goStep(1); break;
      case 'send': send(); break;
      case 'finish': cart = []; form.billDiff = false; changed(C.products.map(p => p.id)); $('#quoteDialog').close(); toast('Merci ! Votre demande est partie.'); break;
      case 'copy': copyText(buildRecap().text).then(ok => toast(ok ? 'Récapitulatif copié' : 'Copie impossible : sélectionnez le texte à la main')); break;
      case 'print': printRecap(); break;
      case 'mail': if (t.dataset.truncated === 'true') copyText(buildRecap().text).then(ok => ok && toast('Récapitulatif complet copié : collez-le dans votre e-mail si besoin')); break;
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('input[data-action$="qty"]')) {
      const a = t.dataset.action;
      if (a === 'sheet-qty') { sheet.qty = Math.max(1, Math.min(999, Math.floor(Number(t.value)) || 1)); updateSheetBtn(); }
      else setQty(t.dataset.key, t.value);
    } else if (t.closest('#pdBody') && t.matches('input')) {
      const fs = t.closest('.opt-group'); fs.classList.remove('has-error'); $('.opt-error', fs).hidden = true;
    }
  });
  ['#qStep2', '#qStep3'].forEach(sel => {
    const root = $(sel);
    root.addEventListener('input', e => {
      const el = e.target; if (!el.name) return;
      readField(el); clearError(el);
      if (el.name === 'date') updateDateHint();
      if (el.name === 'billDiff') $('#billingField').hidden = !el.checked;
    });
    root.addEventListener('change', e => { if (e.target.name === 'billDiff') $('#billingField').hidden = !e.target.checked; });
    root.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); const b = $('#qFoot [data-action="next"], #qFoot [data-action="send"]'); if (b) b.click(); }
    });
  });
  $('#tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    const ids = C.tabs.map(t => t.id); let i = ids.indexOf(currentTab);
    if (e.key === 'ArrowRight') i = (i + 1) % ids.length; else if (e.key === 'ArrowLeft') i = (i - 1 + ids.length) % ids.length; else if (e.key === 'Home') i = 0; else i = ids.length - 1;
    e.preventDefault(); selectTab(ids[i], { focus: true, noScroll: true });
  });

  /* ---------- Démarrage ---------- */
  (function init() {
    const m = /^#carte-([a-z]+)$/.exec(location.hash);
    if (m) currentTab = C.tabs.some(t => t.id === m[1]) ? m[1] : currentTab;
    renderTabs(); renderCatalog(); changed([]);
    if (m) setTimeout(() => $('#carte').scrollIntoView(), 0);
  })();
})();
