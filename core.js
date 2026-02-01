/**
 * 割り勘ツール - core.js
 * アプリ本体：状態管理、計算ロジック、UI、共有、多言語
 */
'use strict';

// =====================================================
// 多言語辞書 (i18n)
// =====================================================
const I18N = {
  ja: {
    appTitle: '割り勘ツール',
    partyList: 'パーティ一覧',
    newParty: '新規作成',
    noParties: 'パーティがありません。新規作成してください。',
    back: '戻る',
    backToEdit: '編集に戻る',
    participants: '参加者',
    items: 'アイテム',
    itemName: '品名',
    amount: '金額',
    qty: '数量',
    payer: '支払者',
    splitMode: '按分',
    targetParticipants: '対象者',
    actions: '操作',
    totalAmount: '合計金額',
    perPerson: '一人あたり',
    showResult: '精算結果を見る',
    settlementResult: '精算結果',
    breakdown: '個人別内訳',
    paymentInstructions: '送金指示',
    share: '共有',
    copyText: 'テキストコピー',
    showQR: 'QRコード',
    exportJSON: 'JSONエクスポート',
    shareURL: 'URL共有',
    settings: '設定',
    roundUnit: '端数単位',
    roundMode: '丸めモード',
    roundNearest: '四捨五入',
    roundCeil: '切り上げ',
    roundFloor: '切り捨て',
    currency: '通貨',
    save: '保存',
    addParticipant: '参加者追加',
    name: '名前',
    color: 'カラー',
    note: 'メモ',
    cancel: 'キャンセル',
    add: '追加',
    addItem: 'アイテム追加',
    selectParticipants: '対象者を選択',
    modeEqual: '等分',
    modeSelected: '個別選択',
    modeRatio: '比率指定',
    importJSON: 'JSONインポート',
    dropzoneText: 'JSONファイルをドラッグ＆ドロップ<br>またはクリックして選択',
    import: 'インポート',
    paid: '支払額',
    shouldPay: '負担額',
    balance: '差額',
    receive: '受取',
    pay: '支払',
    noPaymentNeeded: '送金は不要です',
    copied: 'コピーしました',
    exported: 'エクスポートしました',
    urlCopied: 'URLをコピーしました',
    importSuccess: 'インポートしました',
    importError: 'インポートに失敗しました',
    deleteConfirm: '削除しますか？',
    edit: '編集',
    delete: '削除',
    duplicate: '複製',
    people: '人',
    itemsCount: '件',
    update: '更新'
  },
  en: {
    appTitle: 'Split Bill',
    partyList: 'Party List',
    newParty: 'New Party',
    noParties: 'No parties yet. Create a new one.',
    back: 'Back',
    backToEdit: 'Back to Edit',
    participants: 'Participants',
    items: 'Items',
    itemName: 'Item Name',
    amount: 'Amount',
    qty: 'Qty',
    payer: 'Payer',
    splitMode: 'Split',
    targetParticipants: 'Targets',
    actions: 'Actions',
    totalAmount: 'Total',
    perPerson: 'Per Person',
    showResult: 'View Result',
    settlementResult: 'Settlement Result',
    breakdown: 'Breakdown',
    paymentInstructions: 'Payment Instructions',
    share: 'Share',
    copyText: 'Copy Text',
    showQR: 'QR Code',
    exportJSON: 'Export JSON',
    shareURL: 'Share URL',
    settings: 'Settings',
    roundUnit: 'Round Unit',
    roundMode: 'Round Mode',
    roundNearest: 'Round',
    roundCeil: 'Ceil',
    roundFloor: 'Floor',
    currency: 'Currency',
    save: 'Save',
    addParticipant: 'Add Participant',
    name: 'Name',
    color: 'Color',
    note: 'Note',
    cancel: 'Cancel',
    add: 'Add',
    addItem: 'Add Item',
    selectParticipants: 'Select Participants',
    modeEqual: 'Equal',
    modeSelected: 'Selected',
    modeRatio: 'Ratio',
    importJSON: 'Import JSON',
    dropzoneText: 'Drop JSON file here<br>or click to select',
    import: 'Import',
    paid: 'Paid',
    shouldPay: 'Should Pay',
    balance: 'Balance',
    receive: 'Receive',
    pay: 'Pay',
    noPaymentNeeded: 'No payment needed',
    copied: 'Copied',
    exported: 'Exported',
    urlCopied: 'URL copied',
    importSuccess: 'Imported successfully',
    importError: 'Import failed',
    deleteConfirm: 'Delete this?',
    edit: 'Edit',
    delete: 'Delete',
    duplicate: 'Duplicate',
    people: 'people',
    itemsCount: 'items',
    update: 'Update'
  }
};

// =====================================================
// ユーティリティ
// =====================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function getWeekdayDisplay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
  return weekdayNames[date.getDay()];
}

function updateDateDisplay(dateStr) {
  const weekday = getWeekdayDisplay(dateStr);
  const display = $('#partyDateDisplay');
  if (display) {
    display.textContent = weekday ? `（${weekday}）` : '';
  }
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function formatCurrency(amount, currency = 'JPY') {
  if (currency === 'JPY') {
    return '¥' + amount.toLocaleString('ja-JP');
  }
  return amount.toLocaleString() + ' ' + currency;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// =====================================================
// 状態管理 (State)
// =====================================================
const STORAGE_KEY = 'splitbill_data';
const SETTINGS_KEY = 'splitbill_settings';

const defaultSettings = {
  roundUnit: 1,
  roundMode: 'nearest',
  currency: 'JPY',
  lang: 'ja',
  theme: 'auto'
};

let state = {
  parties: [],
  currentPartyId: null,
  settings: { ...defaultSettings }
};

function loadState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      state.parties = parsed.parties || [];
    }
    const settings = localStorage.getItem(SETTINGS_KEY);
    if (settings) {
      state.settings = { ...defaultSettings, ...JSON.parse(settings) };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ parties: state.parties }));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

function getCurrentParty() {
  return state.parties.find(p => p.id === state.currentPartyId) || null;
}

function createParty(name = '新しいパーティ') {
  const party = {
    id: uuid(),
    name,
    date: today(),
    currency: state.settings.currency,
    settings: {
      roundUnit: state.settings.roundUnit,
      roundMode: state.settings.roundMode
    },
    participants: [],
    items: []
  };
  state.parties.unshift(party);
  saveState();
  return party;
}

function deleteParty(id) {
  state.parties = state.parties.filter(p => p.id !== id);
  saveState();
}

function duplicateParty(id) {
  const party = state.parties.find(p => p.id === id);
  if (!party) return null;
  const newParty = JSON.parse(JSON.stringify(party));
  newParty.id = uuid();
  newParty.name += ' (コピー)';
  newParty.date = today();
  // 新しいIDを振り直し
  const idMap = {};
  newParty.participants = newParty.participants.map(p => {
    const newId = uuid();
    idMap[p.id] = newId;
    return { ...p, id: newId };
  });
  newParty.items = newParty.items.map(item => {
    const newItem = { ...item, id: uuid() };
    if (newItem.payerId && idMap[newItem.payerId]) {
      newItem.payerId = idMap[newItem.payerId];
    }
    if (newItem.selection) {
      newItem.selection = newItem.selection.map(s => idMap[s] || s);
    }
    return newItem;
  });
  state.parties.unshift(newParty);
  saveState();
  return newParty;
}

// =====================================================
// 計算ロジック (Calc)
// =====================================================

/**
 * 丸め処理
 */
function roundAmount(amount, unit, mode) {
  const factor = unit;
  switch (mode) {
    case 'ceil':
      return Math.ceil(amount / factor) * factor;
    case 'floor':
      return Math.floor(amount / factor) * factor;
    case 'nearest':
    default:
      return Math.round(amount / factor) * factor;
  }
}

/**
 * 最大剰余方式で端数を配分
 */
function distributeRemainder(shares, total, unit) {
  // sharesは { id, raw } の配列
  const rounded = shares.map(s => ({
    id: s.id,
    raw: s.raw,
    rounded: Math.floor(s.raw / unit) * unit,
    remainder: s.raw - Math.floor(s.raw / unit) * unit
  }));

  let sum = rounded.reduce((acc, s) => acc + s.rounded, 0);
  let diff = total - sum;

  // 剰余が大きい順にソート
  rounded.sort((a, b) => b.remainder - a.remainder);

  // 差分を1単位ずつ配分
  let i = 0;
  while (diff > 0 && i < rounded.length) {
    rounded[i].rounded += unit;
    diff -= unit;
    i++;
  }

  // マイナスの差分（オーバー）の場合
  i = rounded.length - 1;
  while (diff < 0 && i >= 0) {
    if (rounded[i].rounded >= unit) {
      rounded[i].rounded -= unit;
      diff += unit;
    }
    i--;
  }

  return rounded.reduce((acc, s) => {
    acc[s.id] = s.rounded;
    return acc;
  }, {});
}

/**
 * パーティの精算計算
 */
function calculateSettlement(party) {
  const participants = party.participants;
  const items = party.items;
  const { roundUnit, roundMode } = party.settings;

  if (participants.length === 0) {
    return { breakdown: {}, payments: [], total: 0 };
  }

  // 各参加者の支払額と負担額を計算
  const paid = {}; // 誰がいくら立て替えたか
  const shouldPay = {}; // 誰がいくら負担すべきか

  participants.forEach(p => {
    paid[p.id] = 0;
    shouldPay[p.id] = 0;
  });

  let grandTotal = 0;

  items.forEach(item => {
    const subtotal = item.amountMinor * (item.qty || 1);
    grandTotal += subtotal;

    // 支払者の立替額に加算
    if (item.payerId && paid[item.payerId] !== undefined) {
      paid[item.payerId] += subtotal;
    }

    // 按分対象者を決定
    let targets = [];
    switch (item.mode) {
      case 'selected':
        targets = (item.selection || []).filter(id => participants.some(p => p.id === id));
        break;
      case 'equal':
      default:
        targets = participants.map(p => p.id);
        break;
    }

    if (targets.length === 0) {
      targets = participants.map(p => p.id);
    }

    // 按分計算
    const shareRaw = subtotal / targets.length;
    const shares = targets.map(id => ({ id, raw: shareRaw }));
    const distributed = distributeRemainder(shares, subtotal, roundUnit);

    Object.entries(distributed).forEach(([id, amount]) => {
      shouldPay[id] = (shouldPay[id] || 0) + amount;
    });
  });

  // 負担額の端数調整（全体で合計が一致するように）
  const totalShouldPay = Object.values(shouldPay).reduce((a, b) => a + b, 0);
  if (totalShouldPay !== grandTotal) {
    const diff = grandTotal - totalShouldPay;
    const firstId = participants[0]?.id;
    if (firstId) {
      shouldPay[firstId] += diff;
    }
  }

  // 差額（バランス）計算
  const balance = {};
  participants.forEach(p => {
    balance[p.id] = paid[p.id] - shouldPay[p.id];
  });

  // 最小決済計算
  const payments = calculateMinimumPayments(balance, participants);

  return {
    breakdown: participants.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      paid: paid[p.id],
      shouldPay: shouldPay[p.id],
      balance: balance[p.id]
    })),
    payments,
    total: grandTotal
  };
}

/**
 * 最小決済（貪欲マッチング）
 */
function calculateMinimumPayments(balance, participants) {
  const creditors = []; // プラス（受け取る人）
  const debtors = [];   // マイナス（払う人）

  Object.entries(balance).forEach(([id, amount]) => {
    if (amount > 0) {
      creditors.push({ id, amount });
    } else if (amount < 0) {
      debtors.push({ id, amount: -amount });
    }
  });

  // 絶対値の大きい順にソート
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const payments = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0) {
      payments.push({
        from: debtor.id,
        to: creditor.id,
        amountMinor: amount
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) creditors.shift();
    if (debtor.amount === 0) debtors.shift();
  }

  return payments;
}

// =====================================================
// UI レンダリング
// =====================================================
let currentLang = 'ja';
let editingParticipantId = null;
let editingItemId = null;

function t(key) {
  return I18N[currentLang]?.[key] || I18N.ja[key] || key;
}

function applyI18n() {
  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (el.tagName === 'INPUT' && el.type !== 'button' && el.type !== 'submit') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });
  // dropzoneのHTMLを更新
  const dropzone = $('#dropzone p');
  if (dropzone) {
    dropzone.innerHTML = t('dropzoneText');
  }
}

function showView(viewId) {
  $$('.view').forEach(v => v.classList.add('hidden'));
  $(`#${viewId}`)?.classList.remove('hidden');
}

function showToast(message, type = 'info') {
  const container = $('#toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function openModal(modalId) {
  $(`#${modalId}`)?.classList.remove('hidden');
  $(`#${modalId} .modal-content`)?.focus();
}

function closeModal(modalId) {
  $(`#${modalId}`)?.classList.add('hidden');
}

function closeAllModals() {
  $$('.modal').forEach(m => m.classList.add('hidden'));
}

// ----- ホーム画面 -----
function renderHome() {
  const list = $('#partyList');
  const empty = $('#emptyState');

  list.innerHTML = '';

  if (state.parties.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  state.parties.forEach(party => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="party-card" data-id="${party.id}">
        <div class="party-card-header">
          <span class="party-card-title">${escapeHtml(party.name)}</span>
          <span class="party-card-date">${party.date}</span>
        </div>
        <div class="party-card-info">
          <span>👥 ${party.participants.length} ${t('people')}</span>
          <span>📝 ${party.items.length} ${t('itemsCount')}</span>
        </div>
        <div class="party-card-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-duplicate" data-id="${party.id}">${t('duplicate')}</button>
          <button type="button" class="btn btn-danger btn-sm btn-delete" data-id="${party.id}">${t('delete')}</button>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  // イベント
  $$('.party-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn')) return;
      const id = card.dataset.id;
      state.currentPartyId = id;
      showView('viewEdit');
      renderEdit();
    });
  });

  $$('.btn-duplicate').forEach(btn => {
    btn.addEventListener('click', () => {
      duplicateParty(btn.dataset.id);
      renderHome();
      showToast(t('copied'), 'success');
    });
  });

  $$('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm(t('deleteConfirm'))) {
        deleteParty(btn.dataset.id);
        renderHome();
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ----- 編集画面 -----
function renderEdit() {
  const party = getCurrentParty();
  if (!party) return;

  $('#partyName').value = party.name;
  $('#partyDate').value = party.date;
  updateDateDisplay(party.date);

  renderParticipants();
  renderItems();
  updateSummary();
}

function renderParticipants() {
  const party = getCurrentParty();
  if (!party) return;

  const list = $('#participantList');
  list.innerHTML = '';

  party.participants.forEach(p => {
    const li = document.createElement('li');
    li.className = 'participant-chip';
    li.innerHTML = `
      <span class="participant-color" style="background: ${p.color}"></span>
      <span class="participant-name">${escapeHtml(p.name)}</span>
      <button type="button" class="btn btn-icon btn-edit-participant" data-id="${p.id}" aria-label="${t('edit')}">✏️</button>
      <button type="button" class="btn btn-icon btn-delete-participant" data-id="${p.id}" aria-label="${t('delete')}">🗑️</button>
    `;
    list.appendChild(li);
  });

  // イベント
  $$('.btn-edit-participant').forEach(btn => {
    btn.addEventListener('click', () => {
      editingParticipantId = btn.dataset.id;
      const p = party.participants.find(x => x.id === editingParticipantId);
      if (p) {
        $('#participantName').value = p.name;
        $('#participantColor').value = p.color;
        $('#participantNote').value = p.note || '';
        $('#participantModalTitle').textContent = t('edit');
        $('#btnSaveParticipant').textContent = t('update');
        openModal('modalParticipant');
      }
    });
  });

  $$('.btn-delete-participant').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm(t('deleteConfirm'))) {
        party.participants = party.participants.filter(p => p.id !== btn.dataset.id);
        // アイテムからも削除
        party.items.forEach(item => {
          if (item.payerId === btn.dataset.id) {
            item.payerId = party.participants[0]?.id || null;
          }
          if (item.selection) {
            item.selection = item.selection.filter(id => id !== btn.dataset.id);
          }
        });
        saveState();
        renderEdit();
      }
    });
  });
}

function renderItems() {
  const party = getCurrentParty();
  if (!party) return;

  const tbody = $('#itemsBody');
  tbody.innerHTML = '';

  party.items.forEach(item => {
    const payer = party.participants.find(p => p.id === item.payerId);
    const targets = (item.selection || party.participants.map(p => p.id))
      .map(id => party.participants.find(p => p.id === id))
      .filter(Boolean);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${formatCurrency(item.amountMinor)}</td>
      <td>${item.qty || 1}</td>
      <td>${payer ? escapeHtml(payer.name) : '-'}</td>
      <td>${t('mode' + capitalize(item.mode || 'equal'))}</td>
      <td class="participants-cell">
        ${targets.slice(0, 3).map(p => `<span class="mini-chip"><span class="dot" style="background:${p.color}"></span>${escapeHtml(p.name)}</span>`).join('')}
        ${targets.length > 3 ? `<span class="mini-chip">+${targets.length - 3}</span>` : ''}
      </td>
      <td>
        <button type="button" class="btn btn-sm btn-ghost btn-edit-item" data-id="${item.id}">✏️</button>
        <button type="button" class="btn btn-sm btn-ghost btn-delete-item" data-id="${item.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // イベント
  $$('.btn-edit-item').forEach(btn => {
    btn.addEventListener('click', () => {
      editingItemId = btn.dataset.id;
      const item = party.items.find(x => x.id === editingItemId);
      if (item) {
        $('#itemName').value = item.name;
        $('#itemAmount').value = item.amountMinor;
        $('#itemQty').value = item.qty || 1;
        updatePayerSelect();
        $('#itemPayer').value = item.payerId || '';
        $('#itemMode').value = item.mode || 'equal';
        updateItemSelectionUI();
        if (item.selection) {
          item.selection.forEach(id => {
            const cb = $(`#itemSelection input[value="${id}"]`);
            if (cb) cb.checked = true;
          });
        }
        $('#itemModalTitle').textContent = t('edit');
        $('#btnSaveItem').textContent = t('update');
        openModal('modalItem');
      }
    });
  });

  $$('.btn-delete-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm(t('deleteConfirm'))) {
        party.items = party.items.filter(i => i.id !== btn.dataset.id);
        saveState();
        renderEdit();
      }
    });
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function updateSummary() {
  const party = getCurrentParty();
  if (!party) return;

  const result = calculateSettlement(party);
  $('#totalAmount').textContent = formatCurrency(result.total);
  const perPerson = party.participants.length > 0 
    ? Math.round(result.total / party.participants.length)
    : 0;
  $('#perPerson').textContent = formatCurrency(perPerson);
}

function updatePayerSelect() {
  const party = getCurrentParty();
  if (!party) return;

  const select = $('#itemPayer');
  select.innerHTML = party.participants.map(p => 
    `<option value="${p.id}">${escapeHtml(p.name)}</option>`
  ).join('');
}

function updateItemSelectionUI() {
  const party = getCurrentParty();
  if (!party) return;

  const container = $('#itemSelection');
  container.innerHTML = party.participants.map(p => `
    <label class="checkbox-item">
      <input type="checkbox" value="${p.id}" checked>
      <span class="dot" style="background:${p.color}"></span>
      ${escapeHtml(p.name)}
    </label>
  `).join('');
}

// ----- 結果画面 -----
function renderResult() {
  const party = getCurrentParty();
  if (!party) return;

  const result = calculateSettlement(party);

  // 内訳カード
  const breakdownContainer = $('#breakdownCards');
  breakdownContainer.innerHTML = result.breakdown.map(b => `
    <div class="breakdown-card" style="border-left-color: ${b.color}">
      <div class="breakdown-card-header">
        <span class="participant-color" style="background: ${b.color}"></span>
        <span class="breakdown-card-name">${escapeHtml(b.name)}</span>
      </div>
      <div class="breakdown-card-body">
        <div class="breakdown-row">
          <span>${t('paid')}</span>
          <span>${formatCurrency(b.paid)}</span>
        </div>
        <div class="breakdown-row">
          <span>${t('shouldPay')}</span>
          <span>${formatCurrency(b.shouldPay)}</span>
        </div>
        <div class="breakdown-row total">
          <span>${t('balance')}</span>
          <span class="${b.balance >= 0 ? 'positive' : 'negative'}">
            ${b.balance >= 0 ? '+' : ''}${formatCurrency(b.balance)}
            (${b.balance >= 0 ? t('receive') : t('pay')})
          </span>
        </div>
      </div>
    </div>
  `).join('');

  // 送金カード
  const paymentContainer = $('#paymentCards');
  if (result.payments.length === 0) {
    paymentContainer.innerHTML = `<div class="no-payment">${t('noPaymentNeeded')}</div>`;
  } else {
    paymentContainer.innerHTML = result.payments.map(p => {
      const from = party.participants.find(x => x.id === p.from);
      const to = party.participants.find(x => x.id === p.to);
      return `
        <div class="payment-card">
          <div class="payment-from">
            <span class="participant-color" style="background: ${from?.color || '#ccc'}"></span>
            <span>${escapeHtml(from?.name || '?')}</span>
          </div>
          <span class="payment-arrow">→</span>
          <div class="payment-to">
            <span class="participant-color" style="background: ${to?.color || '#ccc'}"></span>
            <span>${escapeHtml(to?.name || '?')}</span>
          </div>
          <span class="payment-amount">${formatCurrency(p.amountMinor)}</span>
        </div>
      `;
    }).join('');
  }
}

// =====================================================
// 共有機能 (Share)
// =====================================================

function getShareText() {
  const party = getCurrentParty();
  if (!party) return '';

  const result = calculateSettlement(party);
  let text = `【${party.name}】\n`;
  text += `日付: ${party.date}\n`;
  text += `合計: ${formatCurrency(result.total)}\n\n`;

  text += `■ 内訳\n`;
  result.breakdown.forEach(b => {
    text += `${b.name}: ${formatCurrency(b.shouldPay)} (立替: ${formatCurrency(b.paid)}, 差額: ${b.balance >= 0 ? '+' : ''}${formatCurrency(b.balance)})\n`;
  });

  if (result.payments.length > 0) {
    text += `\n■ 送金\n`;
    result.payments.forEach(p => {
      const from = party.participants.find(x => x.id === p.from);
      const to = party.participants.find(x => x.id === p.to);
      text += `${from?.name} → ${to?.name}: ${formatCurrency(p.amountMinor)}\n`;
    });
  }

  return text;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(t('copied'), 'success');
  }).catch(() => {
    // フォールバック
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(t('copied'), 'success');
  });
}

function exportJSON() {
  const party = getCurrentParty();
  if (!party) return;

  const data = {
    version: '1.0',
    party: {
      id: party.id,
      name: party.name,
      date: party.date,
      currency: party.currency,
      settings: party.settings
    },
    participants: party.participants,
    items: party.items
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `splitbill_${party.date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(t('exported'), 'success');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.party || !data.participants || !data.items) {
        throw new Error('Invalid format');
      }

      const party = {
        id: uuid(),
        name: data.party.name || 'インポート',
        date: data.party.date || today(),
        currency: data.party.currency || 'JPY',
        settings: data.party.settings || { ...state.settings },
        participants: data.participants.map(p => ({
          id: uuid(),
          name: p.name,
          color: p.color || '#6B7280',
          note: p.note || ''
        })),
        items: []
      };

      // ID マッピング
      const idMap = {};
      data.participants.forEach((p, i) => {
        idMap[p.id] = party.participants[i].id;
      });

      party.items = data.items.map(item => ({
        id: uuid(),
        name: item.name,
        amountMinor: item.amountMinor,
        qty: item.qty || 1,
        tax: item.tax ?? 10,
        payerId: idMap[item.payerId] || party.participants[0]?.id,
        mode: item.mode || 'equal',
        selection: (item.selection || []).map(id => idMap[id]).filter(Boolean)
      }));

      state.parties.unshift(party);
      saveState();
      closeAllModals();
      renderHome();
      showToast(t('importSuccess'), 'success');
    } catch (err) {
      console.error('Import error:', err);
      showToast(t('importError'), 'error');
    }
  };
  reader.readAsText(file);
}

// =====================================================
// テーマ切替
// =====================================================
function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark');
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  }
  // auto の場合はクラスなし（CSSのprefers-color-schemeに任せる）
}

function toggleTheme() {
  const themes = ['auto', 'light', 'dark'];
  const current = state.settings.theme || 'auto';
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  state.settings.theme = next;
  saveState();
  applyTheme(next);

  const icons = { auto: '🌓', light: '☀️', dark: '🌙' };
  $('#btnTheme').textContent = icons[next];
}

// =====================================================
// イベントバインド
// =====================================================
function bindEvents() {
  // トップバー
  $('#btnLogoHome').addEventListener('click', () => {
    showView('viewHome');
    renderHome();
  });

  $('#btnLang').addEventListener('click', () => {
    currentLang = currentLang === 'ja' ? 'en' : 'ja';
    state.settings.lang = currentLang;
    saveState();
    applyI18n();
    renderHome();
  });

  $('#btnTheme').addEventListener('click', toggleTheme);

  $('#btnSettings').addEventListener('click', () => {
    $('#settingRoundUnit').value = state.settings.roundUnit;
    $('#settingRoundMode').value = state.settings.roundMode;
    $('#settingDefaultTax').value = state.settings.taxDefault;
    $('#settingCurrency').value = state.settings.currency;
    openModal('modalSettings');
  });

  // ホーム
  $('#btnNewParty').addEventListener('click', () => {
    const party = createParty();
    state.currentPartyId = party.id;
    showView('viewEdit');
    renderEdit();
  });

  // 編集画面
  $('#btnBackHome').addEventListener('click', () => {
    showView('viewHome');
    renderHome();
  });

  $('#partyName').addEventListener('change', (e) => {
    const party = getCurrentParty();
    if (party) {
      party.name = e.target.value;
      saveState();
    }
  });

  $('#partyDate').addEventListener('change', (e) => {
    const party = getCurrentParty();
    if (party) {
      party.date = e.target.value;
      updateDateDisplay(party.date);
      saveState();
    }
  });

  $('#btnAddParticipant').addEventListener('click', () => {
    editingParticipantId = null;
    $('#participantName').value = '';
    $('#participantColor').value = getRandomColor();
    $('#participantNote').value = '';
    $('#participantModalTitle').textContent = t('addParticipant');
    $('#btnSaveParticipant').textContent = t('add');
    openModal('modalParticipant');
  });

  $('#btnSaveParticipant').addEventListener('click', () => {
    const party = getCurrentParty();
    if (!party) return;

    const name = $('#participantName').value.trim();
    if (!name) return;

    const color = $('#participantColor').value;
    const note = $('#participantNote').value.trim();

    if (editingParticipantId) {
      const p = party.participants.find(x => x.id === editingParticipantId);
      if (p) {
        p.name = name;
        p.color = color;
        p.note = note;
      }
    } else {
      party.participants.push({
        id: uuid(),
        name,
        color,
        note
      });
    }

    saveState();
    closeModal('modalParticipant');
    renderEdit();
  });

  $('#btnAddItem').addEventListener('click', () => {
    const party = getCurrentParty();
    if (!party || party.participants.length === 0) {
      showToast('先に参加者を追加してください', 'error');
      return;
    }

    editingItemId = null;
    $('#itemName').value = '';
    $('#itemAmount').value = '';
    $('#itemQty').value = 1;
    updatePayerSelect();
    $('#itemMode').value = 'equal';
    updateItemSelectionUI();
    $('#itemModalTitle').textContent = t('addItem');
    $('#btnSaveItem').textContent = t('add');
    openModal('modalItem');
  });

  $('#itemMode').addEventListener('change', (e) => {
    const group = $('#itemSelectionGroup');
    group.style.display = e.target.value === 'selected' ? 'block' : 'none';
  });

  $('#btnSaveItem').addEventListener('click', () => {
    const party = getCurrentParty();
    if (!party) return;

    const name = $('#itemName').value.trim();
    const amount = parseInt($('#itemAmount').value) || 0;
    if (!name || amount <= 0) return;

    const qty = parseInt($('#itemQty').value) || 1;
    const payerId = $('#itemPayer').value;
    const mode = $('#itemMode').value;

    const selection = [];
    $$('#itemSelection input:checked').forEach(cb => {
      selection.push(cb.value);
    });

    if (editingItemId) {
      const item = party.items.find(x => x.id === editingItemId);
      if (item) {
        item.name = name;
        item.amountMinor = amount;
        item.qty = qty;
        item.payerId = payerId;
        item.mode = mode;
        item.selection = selection;
      }
    } else {
      party.items.push({
        id: uuid(),
        name,
        amountMinor: amount,
        qty,
        payerId,
        mode,
        selection
      });
    }

    saveState();
    closeModal('modalItem');
    renderEdit();
  });

  $('#btnCalcResult').addEventListener('click', () => {
    showView('viewResult');
    renderResult();
  });

  // 結果画面
  $('#btnBackEdit').addEventListener('click', () => {
    showView('viewEdit');
    renderEdit();
  });

  $('#btnCopyText').addEventListener('click', () => {
    copyToClipboard(getShareText());
  });

  $('#btnExportJSON').addEventListener('click', exportJSON);

  // 設定モーダル
  $('#btnSaveSettings').addEventListener('click', () => {
    state.settings.roundUnit = parseInt($('#settingRoundUnit').value);
    state.settings.roundMode = $('#settingRoundMode').value;
    state.settings.currency = $('#settingCurrency').value;

    // 現在のパーティにも適用
    const party = getCurrentParty();
    if (party) {
      party.settings = {
        roundUnit: state.settings.roundUnit,
        roundMode: state.settings.roundMode
      };
    }

    saveState();
    closeModal('modalSettings');
    if (party) {
      updateSummary();
    }
    showToast(t('save'), 'success');
  });

  // インポート
  $('#btnImport').addEventListener('click', () => {
    openModal('modalImport');
  });

  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      importJSON(file);
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importJSON(file);
    }
  });

  // モーダル閉じる
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]')) {
      const modal = e.target.closest('.modal');
      if (modal) modal.classList.add('hidden');
    }
  });

  // ESCでモーダル閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // キーボードショートカット
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;

    if (e.key === 'n' || e.key === 'N') {
      const party = getCurrentParty();
      if (party) {
        $('#btnAddParticipant').click();
      }
    }
    if (e.key === 'i' || e.key === 'I') {
      const party = getCurrentParty();
      if (party && party.participants.length > 0) {
        $('#btnAddItem').click();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const party = getCurrentParty();
      if (party) {
        exportJSON();
      }
    }
  });
}

function getRandomColor() {
  const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6', '#F97316'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// =====================================================
// 初期化
// =====================================================
function init() {
  loadState();
  currentLang = state.settings.lang || 'ja';
  applyTheme(state.settings.theme || 'auto');
  applyI18n();
  bindEvents();

  showView('viewHome');
  renderHome();

  // テーマボタンの初期アイコン
  const icons = { auto: '🌓', light: '☀️', dark: '🌙' };
  $('#btnTheme').textContent = icons[state.settings.theme || 'auto'];
}

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', init);
