/* ------------------------------------------------------------------
   Calixir Paris · Offre livrée : sélection → demande de devis
   Les pages (cartes, listes, FAQ) sont générées par build.py ; ce script
   ajoute l'interactivité : boutons « Ajouter à ma demande », fiche produit,
   sélection (type panier, sans paiement), formulaire de devis, récapitulatif
   et confirmation. Données : data.js (généré depuis carte/carte.xlsx).
------------------------------------------------------------------- */
(function () {
  'use strict';

  const C = window.CAL;
  const cfg = C.config;
  const ROOT = document.body.dataset.root || '';
  const IMG = ROOT + 'assets/img/produits/';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur = n => fmt.format(n).replace(/[  ]/g, ' ') + ' €';
  const eurTxt = n => eur(n).replace(/ /g, ' ');
  const eurShort = n => (Number.isInteger(n) ? String(n) + ' €' : eur(n));
  const hid = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'k' + (h >>> 0).toString(36); };
  const delayLabel = d => String(d).replace(/(\d+)\s*h/i, '$1 h');

  const ICON = {
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  const byId = new Map(C.products.map(p => [p.id, p]));
  const qMin = p => p.qmin || 1;

  /* Menus du mois : seuls le mois en cours et le suivant sont proposés (?tous-les-mois pour tout voir). */
  const SHOW_ALL_MONTHS = /[?&]tous-les-mois/.test(location.search);
  const ym = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const curMonth = () => ym(new Date());
  const nextMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1); return ym(d); };
  const monthOk = m => SHOW_ALL_MONTHS || m === curMonth() || m === nextMonth();
  const isAvailable = p => !p.months.length || p.months.some(monthOk);
  const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const deMonth = m => { const n = monthName(m); return (/^[aeiouéèêh]/i.test(n) ? 'd’' : 'de ') + n; };
  const monthName = m => { const [y, mo] = m.split('-').map(Number); return MONTHS_FR[mo - 1] + ' ' + y; };

  /* Jours fériés français (fixes + Pâques) : minimum de commande majoré comme le week-end. */
  const frHolidays = year => {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = new Date(year, month - 1, day);
    const plus = n => { const x = new Date(easter); x.setDate(x.getDate() + n); return x; };
    const set = new Set([[0, 1], [4, 1], [4, 8], [6, 14], [7, 15], [10, 1], [10, 11], [11, 25]].map(([mo, da]) => ym(new Date(year, mo, da)) + '-' + String(da).padStart(2, '0')));
    [plus(1), plus(39), plus(50)].forEach(x => set.add(ym(x) + '-' + String(x.getDate()).padStart(2, '0')));
    return set;
  };
  const catName = new Map(C.categories.map(c => [c.slug, c.name]));

  /* ---------- Stockage (tolérant : navigation privée, file://, etc.) ---------- */
  const store = {
    read() { try { return JSON.parse(localStorage.getItem(cfg.storageKey)) || {}; } catch (e) { return {}; } },
    write(o) { try { localStorage.setItem(cfg.storageKey, JSON.stringify(o)); } catch (e) { /* ignoré */ } }
  };
  const saved = store.read();
  let cart = Array.isArray(saved.cart) ? saved.cart.filter(l => l && byId.has(l.id) && l.qty > 0 && l.opts && typeof l.opts === 'object') : [];
  const droppedMenus = cart.filter(l => !isAvailable(byId.get(l.id))).length;
  cart = cart.filter(l => isAvailable(byId.get(l.id)));
  let form = saved.form && typeof saved.form === 'object' ? saved.form : {};
  const persist = () => store.write({ cart, form });

  /* ---------- Sélection (panier sans paiement) ---------- */
  const optsKey = o => JSON.stringify(Object.keys(o).sort().map(k => [k, Array.isArray(o[k]) ? o[k].slice().sort() : o[k]]));
  const lineKey = (id, opts) => id + '::' + optsKey(opts);
  cart.forEach(l => { l.key = lineKey(l.id, l.opts); });
  const findLine = key => cart.find(l => l.key === key);
  const qtyOf = id => cart.filter(l => l.id === id).reduce((n, l) => n + l.qty, 0);

  /* Prix unitaire d'une ligne : prix de la formule choisie (ex. Agapé) ou prix du produit. */
  function unitPrice(l) {
    const p = byId.get(l.id);
    if (p.priceGroup) {
      const o = p.options.find(x => x.key === p.priceGroup);
      const c = o && o.choices.find(x => x.v === l.opts[p.priceGroup]);
      if (c && c.price != null) return c.price;
      return null;
    }
    return p.price;
  }
  const minPrice = p => {
    if (p.priceGroup) {
      const o = p.options.find(x => x.key === p.priceGroup);
      const ps = o ? o.choices.map(c => c.price).filter(v => v != null) : [];
      return ps.length ? Math.min(...ps) : null;
    }
    return p.price;
  };

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
      const p = byId.get(l.id), u = unitPrice(l); count += l.qty;
      if (u == null) unpriced = true; else total += u * l.qty;
      if (p.from) hasFrom = true;
    });
    return { count, total, hasFrom, unpriced, lines: cart.length };
  }
  function needs72() {
    return cart.some(l => {
      const p = byId.get(l.id);
      if (p.delay) return true;
      return (p.options || []).some(o => (o.choices || []).some(c => c.delay && [].concat(l.opts[o.key] || []).includes(c.v)));
    });
  }
  const describeOpts = (p, opts) => (p.options || []).map(o => {
    const v = [].concat(opts[o.key] || []); if (!v.length) return null;
    return o.label.replace(/\s*\(.*\)/, '') + ' : ' + v.join(', ');
  }).filter(Boolean);
  const totalLabel = t => (t.total === 0 && t.unpriced) ? 'Sur devis' : (t.hasFrom || t.unpriced ? 'dès ' : '') + eur(t.total) + ' HT';

  /* ---------- Boutons des cartes (rendu côté serveur + améliorations ici) ---------- */
  function stepperHTML(key, qty, sm, prefix) {
    const k = esc(key), f = hid(key);
    return `<div class="stepper${sm ? ' sm' : ''}" role="group" aria-label="Quantité">
      <button type="button" data-action="${prefix}dec" data-key="${k}" data-fid="dec-${f}" aria-label="Retirer un">${ICON.minus}</button>
      <input type="number" min="0" max="999" inputmode="numeric" value="${qty}" data-action="${prefix}qty" data-key="${k}" data-fid="qty-${f}" aria-label="Quantité">
      <button type="button" data-action="${prefix}inc" data-key="${k}" data-fid="inc-${f}" aria-label="Ajouter un">${ICON.plus}</button>
    </div>`;
  }
  function controlHTML(p) {
    if (p.options && p.options.length) return `<button type="button" class="add-btn" data-action="open-product" data-id="${p.id}" data-fid="add-${p.id}">${ICON.plus}Ajouter à ma demande</button>`;
    const key = lineKey(p.id, {}), l = findLine(key);
    if (l) return stepperHTML(key, l.qty, false, '');
    return `<button type="button" class="add-btn" data-action="quick-add" data-id="${p.id}" data-fid="add-${p.id}">${ICON.plus}Ajouter à ma demande</button>`;
  }
  function refreshProduct(id) {
    const p = byId.get(id); if (!p) return;
    const q = qtyOf(id);
    $$(`[data-ctrl="${id}"]`).forEach(c => { c.innerHTML = controlHTML(p); });
    $$(`.card[data-id="${id}"] .in-cart`).forEach(b => { b.hidden = !q; b.textContent = q + ' dans ma demande'; });
    $$(`.row[data-id="${id}"] .in-cart-inline`).forEach(b => { b.hidden = !q || !(p.options && p.options.length); b.textContent = q + ' dans ma demande'; });
  }
  function refreshCategoryDots() {
    const counts = {};
    cart.forEach(l => byId.get(l.id).cats.forEach(c => { counts[c] = (counts[c] || 0) + 1; }));
    $$('[data-cat-link]').forEach(a => {
      const d = $('.dot', a); if (!d) return;
      const n = counts[a.dataset.catLink] || 0;
      d.hidden = !n; d.textContent = n;
      d.setAttribute('aria-label', n + ' sélection(s)');
    });
  }

  function restoreFocus(fid) {
    if (!fid) return;
    const el = document.querySelector(`[data-fid="${fid}"]`);
    if (el) el.focus({ preventScroll: true });
  }
  function changed(ids) {
    persist();
    const fid = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fid : null;
    (ids || []).forEach(refreshProduct);
    const t = totals();
    $('#headerCount').hidden = t.lines === 0; $('#headerCount').textContent = t.lines;
    const bar = $('#cartBar'), quoteOpen = $('#quoteDialog').open;
    bar.hidden = t.lines === 0 || quoteOpen;
    document.body.classList.toggle('has-bar', !bar.hidden);
    $('#barCount').textContent = t.lines + (t.lines > 1 ? ' produits' : ' produit');
    $('#barTotal').textContent = totalLabel(t);
    refreshCategoryDots();
    if (quoteOpen && step === 1) renderStep1();
    refreshFoot();
    restoreFocus(fid);
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
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  /* ---------- Fiche produit ---------- */
  let sheet = null; // { id, qty, opts }
  const tagText = t => (C.tags[t] && C.tags[t].text) || '';
  const tagLabel = t => (C.tags[t] && C.tags[t].label) || (t.charAt(0).toUpperCase() + t.slice(1));
  const tagPill = t => {
    const ti = C.tags[t];
    return ti && ti.icon
      ? `<span class="picto" title="${esc(ti.label)}"><img src="${ROOT}assets/img/picto/${esc(ti.icon)}" alt="" height="28"><span>${esc(ti.label)}</span></span>`
      : `<span class="tag">${esc(tagLabel(t))}</span>`;
  };

  function infoRows(p) {
    const rows = [];
    rows.push(['Commande', p.delay ? (tagText(p.delay) || `À commander ${delayLabel(p.delay)} à l’avance (jour ouvré).`) : 'Commande passée avant 12h00 : livraison possible le lendemain.']);
    p.tags.forEach(t => { const x = tagText(t); if (x) rows.push([tagLabel(t), x]); });
    if (p.food) rows.push(['Conservation', 'À consommer froid, sauf indication contraire. Conserver entre 0 et 4 °C et consommer dans les 6 heures suivant la livraison.']);
    rows.push(['Livraison', 'Livré sans service, à l’adresse de votre choix. Frais de livraison précisés dans votre devis.']);
    if (p.food) rows.push(['Allergies', 'Indiquez vos allergies et régimes dans votre demande : Calixir vous répondra dans le devis.']);
    return rows;
  }
  function openProduct(id) {
    const p = byId.get(id); if (!p) return;
    sheet = { id, qty: qMin(p), opts: {} };
    const tagsHtml = p.tags.map(tagPill).join('');
    const leadHtml = p.delay ? `<span class="lead72">${ICON.clock}Commande ${delayLabel(p.delay)} avant</span>` : '';
    const min = minPrice(p);
    const minTxt = qMin(p) > 1 ? (p.unit === 'personne' ? ` · à partir de ${qMin(p)} personnes` : ` · minimum ${qMin(p)} par variété`) : '';
    const priceHtml = min == null
      ? `<b>Sur devis</b><span>${minTxt.replace(/^ · /, '')}</span>`
      : `<b>${eur(min)}</b><span>HT${(p.from || p.priceGroup) ? ' · à partir de' : ''}${p.unit ? ' · par ' + esc(p.unit) : ''}${minTxt}</span>`;
    const listTitle = /^(plateau|menu|pause-box|lunchbox)/.test(p.id) ? 'Comprend' : 'Composition';
    $('#pdBody').innerHTML = `
      ${p.img ? `<div class="pd-media"><img src="${IMG + esc(p.img)}" alt=""></div>` : '<div style="height:20px"></div>'}
      <div class="pd-body">
        <h2 id="pdTitle">${esc(p.name)}</h2>
        ${p.sub ? `<p class="pd-sub">${esc(p.sub)}</p>` : ''}
        <div class="pd-price">${priceHtml}</div>
        ${(tagsHtml || leadHtml) ? `<div class="pd-meta">${tagsHtml}${leadHtml}</div>` : ''}
        ${p.items.length ? `<div class="pd-list"><h4>${listTitle}</h4><ul>${p.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}
        ${p.note ? `<p class="pd-note">${esc(p.note)}</p>` : ''}
        ${(p.details || []).map(d => `<details class="pd-details"><summary>${esc(d.title)}</summary><ul>${d.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>`).join('')}
        ${(p.options || []).map(o => `
          <fieldset class="opt-group" data-opt="${esc(o.key)}">
            <legend>${esc(o.label)}${o.required ? '<span class="req">à choisir</span>' : ''}</legend>
            ${o.choices.map(c => `<label class="tile"><input type="${o.type === 'check' ? 'checkbox' : 'radio'}" name="opt-${esc(o.key)}" value="${esc(c.v)}"><span class="tile-text">${esc(c.v)}${(c.sub || c.delay) ? `<small>${esc([c.sub, c.delay ? 'commande ' + delayLabel(c.delay) + ' avant' : ''].filter(Boolean).join(' · '))}</small>` : ''}</span>${c.price != null ? `<span class="tile-price">${eur(c.price)}</span>` : ''}</label>`).join('')}
            <p class="opt-error" hidden>Merci de faire un choix.</p>
          </fieldset>`).join('')}
        <div class="pd-info"><h4>Informations utiles</h4><dl>${infoRows(p).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
      </div>`;
    $('#pdFoot').innerHTML = `${stepperHTML('sheet', 1, false, 'sheet-')}<button type="button" class="btn btn-primary" data-action="sheet-add" id="sheetAdd"></button>`;
    updateSheetBtn();
    openDialog($('#productDialog'));
    $('#pdBody').scrollTop = 0;
  }
  function sheetUnit() {
    const p = byId.get(sheet.id);
    if (p.priceGroup) {
      const o = p.options.find(x => x.key === p.priceGroup), v = sheet.opts[p.priceGroup];
      const c = o && o.choices.find(x => x.v === v);
      return c && c.price != null ? c.price : null;
    }
    return p.price;
  }
  function updateSheetBtn() {
    const b = $('#sheetAdd'); if (!b) return;
    const u = sheetUnit();
    b.innerHTML = u == null ? '<span>Ajouter à ma demande</span>' : `<span>Ajouter à ma demande</span><small>${eur(u * sheet.qty)} HT</small>`;
    $('#pdFoot input[data-action="sheet-qty"]').value = sheet.qty;
  }
  function readSheetOpts() {
    const p = byId.get(sheet.id);
    (p.options || []).forEach(o => {
      const fs = $(`.opt-group[data-opt="${o.key}"]`, $('#pdBody'));
      const vals = $$('input:checked', fs).map(i => i.value);
      if (vals.length) sheet.opts[o.key] = o.type === 'check' ? vals : vals[0]; else delete sheet.opts[o.key];
    });
  }
  function addFromSheet() {
    const p = byId.get(sheet.id); let first = null;
    readSheetOpts();
    (p.options || []).forEach(o => {
      const fs = $(`.opt-group[data-opt="${o.key}"]`, $('#pdBody'));
      const missing = o.required && !sheet.opts[o.key];
      fs.classList.toggle('has-error', missing); $('.opt-error', fs).hidden = !missing;
      if (missing && !first) first = fs;
    });
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    addLine(sheet.id, Object.assign({}, sheet.opts), sheet.qty);
    $('#productDialog').close();
    toast('Ajouté à votre demande');
  }

  /* ---------- Tiroir « Ma demande de devis » ---------- */
  let step = 1, sendMode = null, sendError = '';
  const PROGRESS_STEPS = 4;

  function openQuote(n) {
    if ($('#productDialog').open) $('#productDialog').close();
    sendMode = null; sendError = '';
    bindFormValues(); updateDateMin();
    goStep(n || 1, true);
    openDialog($('#quoteDialog'));
    $('#cartBar').hidden = true; document.body.classList.remove('has-bar');
  }
  function goStep(n, silent) {
    step = n;
    for (let s = 1; s <= 5; s++) $('#qStep' + s).hidden = s !== n;
    $$('#qProgress li').forEach(li => {
      const s = Number(li.dataset.step);
      li.classList.toggle('is-active', s === n); li.classList.toggle('is-done', s < n);
      if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('#qProgress').classList.toggle('is-hidden', n === 5);
    if (n === 1) renderStep1();
    if (n === 2 || n === 3) renderSelSummary();
    if (n === 4) renderStep4();
    if (n === 5) renderStep5();
    refreshFoot();
    $('#qBody').scrollTop = 0;
    if (!silent) { const h = $('#qStep' + n + ' .step-title, #qStep' + n + ' h3'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
  }

  /* Avertissements doux, tirés des conditions de vente (jamais bloquants). */
  const isWeekend = ymdStr => { if (!ymdStr) return false; const d = parseYmd(ymdStr).getDay(); return d === 0 || d === 6; };
  const isOffDay = ymdStr => !!ymdStr && (isWeekend(ymdStr) || frHolidays(Number(ymdStr.slice(0, 4))).has(ymdStr));
  function minOrderNotice() {
    const t = totals();
    if (!cart.length || t.unpriced || !cfg.minHtWeek) return '';
    const wk = isOffDay(form.date) ? cfg.minHtWeekend : cfg.minHtWeek;
    if (t.total * 1.10 >= wk) return '';
    return `Minimum de commande : ${eurShort(cfg.minHtWeek)} HT hors transport en semaine, ${eurShort(cfg.minHtWeekend)} HT les week-ends et jours fériés. Votre sélection est inférieure : ajoutez des produits ou envoyez-la tout de même, Calixir vous confirmera.`;
  }
  function qtyNotices() {
    const groups = new Map(), out = [];
    cart.forEach(l => {
      const p = byId.get(l.id);
      if (qMin(p) <= 1) return;
      const label = p.minPar ? (l.opts[p.minPar] || '') : '';
      const key = p.id + '|' + label;
      const g = groups.get(key) || { p, label, qty: 0 };
      g.qty += l.qty; groups.set(key, g);
    });
    groups.forEach(g => {
      const mn = qMin(g.p);
      if (g.qty >= mn) return;
      out.push(g.p.unit === 'personne'
        ? `${g.p.name} : à partir de ${mn} personnes (vous en avez indiqué ${g.qty}).`
        : `${g.p.name}${g.label ? ' · ' + g.label : ''} : minimum de ${mn} par variété et par commande (${g.qty} sélectionné${g.qty > 1 ? 's' : ''}).`);
    });
    return out;
  }
  function monthMismatch(ymdStr) {
    if (!ymdStr) return [];
    const dm = ymdStr.slice(0, 7), out = [];
    cart.forEach(l => { const p = byId.get(l.id); if (p.months.length && !p.months.includes(dm)) { const t = `${p.name} (menu ${p.months.map(deMonth).join(' / ')})`; if (!out.includes(t)) out.push(t); } });
    return out;
  }
  function varietyNotice() {
    const menus = new Set(cart.filter(l => byId.get(l.id).cat === 'plateaux-repas').map(l => l.id));
    if (!menus.size) return '';
    const g = Number(form.guests) || 0, max = g && g <= 15 ? 3 : 4;
    if (menus.size <= max) return '';
    return `Plateaux repas : ${g && g <= 15 ? '3 variétés maximum jusqu’à 15 personnes' : '4 variétés maximum au-delà de 15 personnes'}. Votre sélection en compte ${menus.size} : Calixir vous proposera un ajustement.`;
  }

  function renderStep1() {
    const el = $('#qStep1'), t = totals();
    if (!cart.length) {
      el.innerHTML = `<div class="empty"><h3>Votre demande est vide</h3><p>Ajoutez des plateaux, coffrets ou boissons depuis la carte pour préparer votre devis. Aucun paiement n’est demandé.</p><button type="button" class="btn btn-primary" data-action="close-dialog">Parcourir la carte</button></div>`;
      return;
    }
    const notices = [minOrderNotice(), varietyNotice(), ...qtyNotices()].filter(Boolean);
    el.innerHTML = `
      <h3 class="step-title">Votre sélection</h3>
      <ul class="lines">${cart.map(l => {
        const p = byId.get(l.id), opts = describeOpts(p, l.opts), u = unitPrice(l);
        return `<li class="line">
          <div><div class="line-name">${esc(p.name)}${p.sub ? ` <span class="line-unit">· ${esc(p.sub)}</span>` : ''}</div>
            ${opts.length ? `<p class="line-opts">${opts.map(esc).join('<br>')}</p>` : ''}
            <span class="line-unit">${u == null ? 'Prix sur devis' : (p.from ? 'à partir de ' : '') + eur(u) + ' HT l’unité'}</span></div>
          <div class="line-total">${u == null ? '—' : eur(u * l.qty)}</div>
          <div class="line-ctrl">${stepperHTML(l.key, l.qty, true, 'line-')}<button type="button" class="line-del" data-action="line-remove" data-key="${esc(l.key)}">Retirer</button></div>
        </li>`;
      }).join('')}</ul>
      <div class="total-box">
        <div class="total-row"><span>Estimation ${t.hasFrom || t.unpriced ? '(prix de départ)' : ''}</span><b>${totalLabel(t)}</b></div>
        <p>Estimation indicative hors transport${cfg.transportFrom ? ' (à partir de ' + eur(cfg.transportFrom) + ' HT, selon votre adresse)' : ''} et hors TVA. Calixir vous envoie un devis définitif.</p>
      </div>
      ${notices.map(n => `<p class="notice">${esc(n)}</p>`).join('')}
      <button type="button" class="btn btn-ghost add-more" data-action="close-dialog">+ Ajouter d’autres produits</button>`;
  }
  function renderSelSummary() {
    const t = totals();
    const html = `<details class="sel-summary"><summary><span>Ma sélection · ${t.lines} produit${t.lines > 1 ? 's' : ''}</span><span>${esc(totalLabel(t))}</span></summary><ul>${cart.map(l => {
      const p = byId.get(l.id), o = describeOpts(p, l.opts);
      return `<li><span>${l.qty} × ${esc(p.name)}${o.length ? `<span class="opts">${o.map(esc).join(' · ')}</span>` : ''}</span><span>${unitPrice(l) == null ? '—' : eur(unitPrice(l) * l.qty)}</span></li>`;
    }).join('')}</ul></details>`;
    $$('.sel-slot').forEach(s => { s.innerHTML = cart.length ? html : ''; });
  }

  function refreshFoot() {
    const f = $('#qFoot'); if (!f) return;
    const t = totals();
    const est = `<div class="est"><span>Estimation HT</span><b>${esc(totalLabel(t))}</b></div>`;
    if (step === 1) f.innerHTML = cart.length ? `${est}<span class="grow"></span><button type="button" class="btn btn-primary" data-action="next">Demander un devis</button>` : '<span class="grow"></span>';
    else if (step === 2) f.innerHTML = `<button type="button" class="btn btn-ghost" data-action="back">Retour</button>${est}<span class="grow"></span><button type="button" class="btn btn-primary" data-action="next">Continuer</button>`;
    else if (step === 3) f.innerHTML = `<button type="button" class="btn btn-ghost" data-action="back">Retour</button>${est}<span class="grow"></span><button type="button" class="btn btn-primary" data-action="next">Voir le récapitulatif</button>`;
    else if (step === 4) f.innerHTML = `<button type="button" class="btn btn-ghost" data-action="back">Retour</button><span class="grow"></span><button type="button" class="btn btn-primary" data-action="send" id="sendBtn">Envoyer ma demande de devis</button>`;
    else f.innerHTML = sendMode === 'endpoint'
      ? '<span class="grow"></span><button type="button" class="btn btn-primary" data-action="finish">Terminer</button>'
      : '<button type="button" class="btn btn-ghost" data-action="goto-step" data-step="4">Revoir ma demande</button><span class="grow"></span><button type="button" class="btn btn-ghost" data-action="close-dialog">Fermer</button>';
  }

  /* ----- Formulaires : valeurs, validation ----- */
  function bindFormValues() {
    $$('#qStep2 [name], #qStep3 [name]').forEach(el => {
      const v = form[el.name];
      if (el.type === 'radio') el.checked = v === el.value;
      else if (el.type === 'checkbox' && el.name === 'diet') el.checked = Array.isArray(v) && v.includes(el.value);
      else if (el.type === 'checkbox') el.checked = el.name === 'consent' ? false : !!v;
      else el.value = v == null ? '' : v;
    });
    $('#billingField').hidden = !$('#f-billDiff').checked;
    $$('.has-error').forEach(f => f.classList.remove('has-error'));
    $$('.form .error').forEach(e => e.remove());
  }
  function readField(el) {
    if (el.type === 'radio') { if (el.checked) form[el.name] = el.value; }
    else if (el.name === 'diet') form.diet = $$('#qStep2 input[name="diet"]:checked').map(i => i.value);
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
    updateDateHint(); updateTimeHint();
  }
  function updateDateHint() {
    const hint = $('#dateHint'), v = $('#f-date').value; const msgs = [];
    if (v) {
      const now = new Date(), today = startOfToday(), d = parseYmd(v), diff = Math.round((d - today) / 864e5);
      if (needs72() && diff < 3) msgs.push('Certains produits de votre sélection se commandent 72 h à l’avance : Calixir vous confirmera si cette date est possible.');
      if (diff === 1 && now.getHours() >= 12) msgs.push('Les commandes passées après 12h00 ne sont pas garanties pour le lendemain : appelez-nous au ' + cfg.phone + '.');
      const dow = today.getDay();
      if (dow === 6 || dow === 0) {
        const monday = new Date(today); monday.setDate(monday.getDate() + (dow === 6 ? 2 : 1));
        if (d <= monday) msgs.push('Les commandes ne sont pas prises le week-end pour une livraison du même week-end ou du lundi suivant. Appelez-nous au ' + cfg.phone + '.');
      }
      if (isOffDay(v) && cfg.minHtWeekend) msgs.push(`Livraison un week-end ou un jour férié : minimum de commande de ${eurShort(cfg.minHtWeekend)} HT hors transport.`);
      const mism = monthMismatch(v);
      if (mism.length) msgs.push(`Menus proposés à une autre date : ${mism.join(' ; ')}.`);
    }
    hint.hidden = !msgs.length; hint.className = 'hint' + (msgs.length ? ' warn' : ''); hint.textContent = msgs.join(' ');
  }
  function updateTimeHint() {
    const h = $('#timeHint'), v = $('#f-timeFrom').value;
    const out = v && (v < '07:00' || v > '19:30');
    h.hidden = !out; h.className = 'hint' + (out ? ' warn' : '');
    h.textContent = out ? 'Nos livraisons se font entre 7h et 19h30 : Calixir vous contactera pour confirmer cet horaire.' : '';
  }
  function fieldError(el, msg) {
    const wrap = el.closest('.field'); if (!wrap) return;
    wrap.classList.add('has-error');
    let p = wrap.querySelector('.error');
    if (!p) { p = document.createElement('p'); p.className = 'error'; p.id = 'err-' + (el.id || el.name); if (el.type === 'radio') wrap.appendChild(p); else el.insertAdjacentElement('afterend', p); }
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
      if (el.type === 'radio') { if (!$$(`input[name="${el.name}"]`).some(x => x.checked)) msg = 'Choisissez le matin ou l’après-midi.'; }
      else if (el.type === 'checkbox') { if (!el.checked) msg = 'Merci de cocher cette case pour continuer.'; }
      else if (v.valueMissing) msg = 'Ce champ est obligatoire.';
      else if (v.typeMismatch && el.type === 'email') msg = 'Adresse e-mail invalide.';
      else if (v.patternMismatch && el.name === 'zip') msg = 'Code postal à 5 chiffres.';
      else if (v.rangeUnderflow && el.type === 'date') msg = 'Choisissez une date à partir de demain.';
      else if (v.rangeUnderflow) msg = 'Indiquez au moins 1.';
      else if (!v.valid) msg = 'Valeur invalide.';
      if (!msg && el.name === 'phone' && el.value.replace(/\D/g, '').length < 8) msg = 'Numéro de téléphone invalide.';
      if (msg) { fieldError(el, msg); if (!first) first = el; }
    });
    if (first) first.focus();
    return !first;
  }

  /* ----- Récapitulatif ----- */
  const longDate = s => parseYmd(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const newRef = () => { const d = new Date(); const r = Math.random().toString(36).slice(2, 6).toUpperCase(); return 'DV-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + r; };
  const addressText = () => [form.address, [form.zip, form.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const timeText = () => (form.slot || '') + (form.timeFrom ? ' · vers ' + form.timeFrom : '');

  function buildRecap() {
    const t = totals();
    const lines = cart.map(l => {
      const p = byId.get(l.id), u = unitPrice(l);
      return { qty: l.qty, name: p.name + (p.sub ? ' (' + p.sub + ')' : ''), options: describeOpts(p, l.opts), unit: u, from: !!p.from, total: u == null ? null : u * l.qty };
    });
    const who = [form.firstName, form.lastName].filter(Boolean).join(' ');
    const out = [];
    out.push('DEMANDE DE DEVIS (et non commande) · Calixir Paris, offre livrée' + (form.ref ? ' · Réf. ' + form.ref : ''), '');
    out.push('CONTACT');
    out.push('Société : ' + (form.company || ''));
    out.push('Nom : ' + who);
    out.push('E-mail : ' + (form.email || '')); out.push('Téléphone : ' + (form.phone || ''));
    if (form.po) out.push('N° de bon de commande / référence : ' + form.po);
    if (form.billDiff && form.billing) out.push('Facturation : ' + form.billing.replace(/\s*\n\s*/g, ', '));
    out.push('', 'LIVRAISON');
    out.push('Date : ' + (form.date ? longDate(form.date) : ''));
    out.push('Livraison : ' + timeText());
    out.push('Nombre de personnes : ' + (form.guests || ''));
    out.push('Adresse : ' + addressText());
    if (form.access) out.push('Accès : ' + form.access.replace(/\s*\n\s*/g, ' / '));
    if (form.diet && form.diet.length) out.push('Régimes : ' + form.diet.join(', '));
    if (form.notes) out.push('Commentaires : ' + form.notes.replace(/\s*\n\s*/g, ' / '));
    out.push('', 'PRODUITS SÉLECTIONNÉS');
    const selection = lines.map(l => {
      let s = '• ' + l.qty + ' × ' + l.name;
      if (l.options.length) s += '\n    ' + l.options.join('\n    ');
      s += '\n    ' + (l.unit == null ? 'Prix sur devis' : (l.from ? 'à partir de ' : '') + eurTxt(l.unit) + ' HT l’unité → ' + eurTxt(l.total) + ' HT');
      return s;
    });
    const condensed = lines.map(l => '• ' + l.qty + ' × ' + l.name + (l.options.length ? ' [' + l.options.join(' ; ') + ']' : ''));
    out.push(...selection);
    const est = 'Estimation indicative : ' + (t.hasFrom || t.unpriced ? 'dès ' : '') + eurTxt(t.total) + ' HT (hors livraison et TVA)';
    out.push('', est, '', 'Demande envoyée depuis le site Calixir Paris (offre livrée).');
    const head = out.slice(0, out.indexOf('PRODUITS SÉLECTIONNÉS') + 1);
    return { text: out.join('\n'), short: [...head, ...condensed, '', est].join('\n'), lines, estimate: t, who };
  }
  function mailtoHref(r) {
    const subject = `Demande de devis ${form.ref || ''} · ${form.company || r.who} · livraison du ${form.date ? parseYmd(form.date).toLocaleDateString('fr-FR') : ''}`;
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
    $('#printArea').innerHTML = `<img src="${ROOT}assets/img/brand/logo-horizontal.png" alt="Calixir Paris"><h1>Demande de devis</h1>
      <p><strong>Ceci est une demande de devis, pas une commande.</strong>${form.ref ? ' Réf. ' + esc(form.ref) : ''}</p>
      <p>${esc(form.company || '')}<br>${esc(r.who)} · ${esc(form.email || '')} · ${esc(form.phone || '')}</p>
      <h2>Livraison</h2><p>${esc(form.date ? longDate(form.date) : '')}, ${esc(timeText())} · ${esc(form.guests || '')} personnes<br>${esc(addressText())}${form.access ? '<br>' + esc(form.access) : ''}${form.diet && form.diet.length ? '<br>Régimes : ' + esc(form.diet.join(', ')) : ''}${form.notes ? '<br>' + esc(form.notes) : ''}</p>
      <h2>Produits sélectionnés</h2><table>${r.lines.map(l => `<tr><td>${l.qty} × ${esc(l.name)}${l.options.length ? '<br><small>' + l.options.map(esc).join(' · ') + '</small>' : ''}</td><td>${l.total == null ? 'sur devis' : eurTxt(l.total) + ' HT'}</td></tr>`).join('')}</table>
      <p><strong>Estimation indicative : ${t.hasFrom || t.unpriced ? 'dès ' : ''}${eurTxt(t.total)} HT</strong> (hors livraison et TVA)</p>`;
    window.print();
  }

  /* Étape 4 : récapitulatif complet avant envoi */
  function renderStep4() {
    const r = buildRecap(), t = r.estimate;
    const notices = [minOrderNotice(), varietyNotice(), ...qtyNotices(), ...(monthMismatch(form.date).length ? ['Menus proposés à une autre date : ' + monthMismatch(form.date).join(' ; ') + '.'] : [])].filter(Boolean);
    const blk = (title, stepNo, inner) => `<section class="review-block"><div class="review-head"><h4>${title}</h4><button type="button" class="link-btn" data-action="goto-step" data-step="${stepNo}">Modifier</button></div>${inner}</section>`;
    const dl = rows => `<dl>${rows.filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
    $('#qStep4').innerHTML = `
      <h3 class="step-title">Vérifiez votre demande</h3>
      <p class="review-intro">Relisez les informations ci-dessous avant l’envoi. Vous pouvez tout modifier.</p>
      ${blk('Produits sélectionnés', 1, `<ul class="review-lines">${r.lines.map(l => `<li><span>${l.qty} × ${esc(l.name)}${l.options.length ? `<span class="opts">${l.options.map(esc).join(' · ')}</span>` : ''}</span><span class="amt">${l.total == null ? 'sur devis' : eur(l.total)}</span></li>`).join('')}</ul>
        <div class="total-row" style="margin-top:12px"><span>Estimation HT${t.hasFrom || t.unpriced ? ' (prix de départ)' : ''}</span><b>${esc(totalLabel(t).replace(' HT', ''))}</b></div>
        <p class="line-unit" style="margin:6px 0 0">Hors transport et TVA. Le devis définitif vous est envoyé par Calixir.</p>`)}
      ${blk('Livraison', 2, dl([
        ['Date', form.date ? longDate(form.date) : ''], ['Livraison', timeText()], ['Personnes', form.guests],
        ['Adresse', addressText()], form.access && ['Accès', form.access], form.diet && form.diet.length && ['Régimes', form.diet.join(', ')], form.notes && ['Commentaires', form.notes]]))}
      ${blk('Coordonnées', 3, dl([
        ['Société', form.company], ['Contact', r.who], ['E-mail', form.email], ['Téléphone', form.phone],
        form.po && ['Réf. / bon de commande', form.po], form.billDiff && form.billing && ['Facturation', form.billing]]))}
      ${notices.map(n => `<p class="notice">${esc(n)}</p>`).join('')}
      <p class="legal-note"><strong>Il s’agit d’une demande de devis, pas d’une commande.</strong> Aucun paiement n’est demandé. Calixir vous répond avec un devis, valable 2 mois après son envoi ; la commande n’est définitive qu’une fois ce devis accepté. <a href="${ROOT}cgv/" target="_blank" rel="noopener">Conditions générales de vente</a></p>`;
  }

  /* Étape 5 : confirmation */
  function renderStep5() {
    const r = buildRecap(), el = $('#qStep5');
    const ref = form.ref ? `<span class="ref">Réf. ${esc(form.ref)}</span>` : '';
    const legal = `<p class="legal-note"><strong>Ceci est une demande de devis, et non une commande.</strong> Elle ne vous engage pas : la commande n’est validée qu’après acceptation du devis que Calixir vous enverra.</p>`;
    if (sendMode === 'endpoint') {
      el.innerHTML = `<div class="done"><span class="badge">${ICON.check}</span><h3>Votre demande de devis a bien été envoyée</h3>${ref}
        <p>Merci ${esc(form.firstName || '')} ! Calixir a reçu votre demande et vous répond par e-mail avec votre devis personnalisé.</p>
        ${legal}
        <ol class="next-steps"><li><b>1</b><span>Calixir étudie votre demande (produits, quantités, livraison).</span></li><li><b>2</b><span>Vous recevez un devis par e-mail à ${esc(form.email || 'votre adresse')}, valable 2 mois.</span></li><li><b>3</b><span>Votre commande est confirmée lorsque vous acceptez ce devis.</span></li></ol>
        <p class="muted" style="font-size:.88rem">Une question ? Appelez-nous au <a href="tel:${cfg.phoneHref}">${esc(cfg.phone)}</a> (${esc(cfg.hours)}).</p>
        <div class="recap">${esc(r.text)}</div></div>`;
      return;
    }
    const { href, truncated } = mailtoHref(r);
    el.innerHTML = `<div class="done"><span class="badge">${ICON.check}</span><h3>Votre demande de devis est prête</h3>${ref}
      <p>Dernière étape : envoyez-la à Calixir par e-mail, le message est déjà rédigé.</p>
      ${sendError ? `<p class="send-error">${esc(sendError)}</p>` : ''}
      ${legal}
      <div class="done-actions">
        <a class="btn btn-primary btn-lg" href="${esc(href)}" data-action="mail" data-truncated="${truncated}">Envoyer par e-mail</a>
        <button type="button" class="btn btn-ghost" data-action="copy">Copier le récapitulatif</button>
        <button type="button" class="btn btn-ghost" data-action="print">Imprimer / enregistrer en PDF</button>
      </div>
      <p class="muted" style="font-size:.88rem">Une question ? Appelez-nous au <a href="tel:${cfg.phoneHref}">${esc(cfg.phone)}</a> (${esc(cfg.hours)}).</p>
      <div class="recap">${esc(r.text)}</div></div>`;
  }

  async function send() {
    $$('#qStep2 [name], #qStep3 [name]').forEach(readField);
    if (!form.ref) { form.ref = newRef(); persist(); }
    if (form.website) { sendMode = 'endpoint'; return goStep(5); } // champ piège : on fait semblant
    sendError = '';
    if (!cfg.endpoint) { sendMode = 'mail'; return goStep(5); }
    const btn = $('#sendBtn'); btn.disabled = true; btn.textContent = 'Envoi en cours…';
    const r = buildRecap();
    const payload = {
      _subject: `Demande de devis ${form.ref} · ${form.company || r.who} · livraison du ${form.date ? parseYmd(form.date).toLocaleDateString('fr-FR') : ''}`,
      reference: form.ref, type: 'demande de devis (non commande)',
      email: form.email, name: r.who, company: form.company || '', phone: form.phone, po: form.po || '',
      delivery: { date: form.date, slot: form.slot || '', time: form.timeFrom || '', guests: form.guests, address: form.address, zip: form.zip, city: form.city, access: form.access || '' },
      diet: form.diet || [], comments: form.notes || '', billing: form.billDiff ? form.billing : '',
      lines: r.lines, estimate: r.estimate, message: r.text
    };
    try {
      const res = await fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      sendMode = 'endpoint';
    } catch (e) {
      sendMode = 'mail'; sendError = 'L’envoi automatique n’a pas abouti. Vous pouvez transmettre votre demande par e-mail ci-dessous.';
    }
    goStep(5);
  }

  /* ---------- Événements ---------- */
  document.addEventListener('click', e => {
    const media = e.target.closest('.card-media, .card-teaser');
    if (media && !e.target.closest('[data-action]')) { const c = media.closest('.card[data-id]'); if (c) { openProduct(c.dataset.id); return; } }
    const t = e.target.closest('[data-action]'); if (!t) return;
    const a = t.dataset.action, key = t.dataset.key;
    switch (a) {
      case 'open-product': openProduct(t.dataset.id); break;
      case 'quick-add': addLine(t.dataset.id, {}, qMin(byId.get(t.dataset.id))); break;
      case 'add': { const p = byId.get(t.dataset.id); if (p && p.options.length) openProduct(p.id); else addLine(t.dataset.id, {}, qMin(p)); break; }
      case 'inc': case 'line-inc': setQty(key, findLine(key).qty + 1); break;
      case 'dec': case 'line-dec': setQty(key, findLine(key).qty - 1); break;
      case 'line-remove': setQty(key, 0); break;
      case 'sheet-inc': sheet.qty = Math.min(999, sheet.qty + 1); updateSheetBtn(); break;
      case 'sheet-dec': sheet.qty = Math.max(1, sheet.qty - 1); updateSheetBtn(); break;
      case 'sheet-add': addFromSheet(); break;
      case 'open-quote': openQuote(1); break;
      case 'close-dialog': t.closest('dialog').close(); break;
      case 'next':
        if (step === 1) goStep(2);
        else if (step === 2 && validateSection('#qStep2')) { $$('#qStep2 [name]').forEach(readField); goStep(3); }
        else if (step === 3 && validateSection('#qStep3')) { $$('#qStep3 [name]').forEach(readField); if (!form.ref) { form.ref = newRef(); persist(); } goStep(4); }
        break;
      case 'back': goStep(step - 1); break;
      case 'goto-step': goStep(Number(t.dataset.step)); break;
      case 'send': send(); break;
      case 'finish': cart = []; form.billDiff = false; delete form.ref; changed(C.products.map(p => p.id)); $('#quoteDialog').close(); toast('Merci ! Votre demande de devis est partie.'); break;
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
      readSheetOpts(); updateSheetBtn();
    }
  });
  ['#qStep2', '#qStep3'].forEach(sel => {
    const root = $(sel);
    root.addEventListener('input', e => {
      const el = e.target; if (!el.name) return;
      readField(el); clearError(el);
      if (el.name === 'date') updateDateHint();
      if (el.name === 'timeFrom') updateTimeHint();
      if (el.name === 'billDiff') $('#billingField').hidden = !el.checked;
    });
    root.addEventListener('change', e => { if (e.target.name === 'billDiff') $('#billingField').hidden = !e.target.checked; });
    root.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); const b = $('#qFoot [data-action="next"]'); if (b) b.click(); }
    });
  });

  /* Menu mobile */
  const navBtn = $('.nav-toggle'), nav = $('#mainNav');
  if (navBtn && nav) {
    navBtn.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); navBtn.setAttribute('aria-expanded', open); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { nav.classList.remove('is-open'); navBtn.setAttribute('aria-expanded', 'false'); navBtn.focus(); } });
  }

  /* ---------- Démarrage ---------- */
  $$('.group[data-mois]').forEach(g => { g.hidden = !monthOk(g.dataset.mois); });
  $$('[data-ctrl]').forEach(c => { const p = byId.get(c.dataset.ctrl); if (p) c.innerHTML = controlHTML(p); });
  C.products.forEach(p => { if (qtyOf(p.id)) refreshProduct(p.id); });
  changed([]);
  if (droppedMenus) toast('Certains menus de votre sélection ne sont plus proposés : ils ont été retirés.');
  if (/^#p-/.test(location.hash)) { const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 50); }
})();
