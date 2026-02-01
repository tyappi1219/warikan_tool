/**
 * 割り勘ツール - テストケース
 * 複雑な割り勘計算が正確に行われることをテスト
 */

// =====================================================
// 計算関数をエクスポート可能にするために、Node.js環境での実行に対応
// =====================================================

// テスト用の計算関数をこのファイルにコピー
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

function distributeRemainder(shares, total, unit) {
  const rounded = shares.map(s => ({
    id: s.id,
    raw: s.raw,
    rounded: Math.floor(s.raw / unit) * unit,
    remainder: s.raw - Math.floor(s.raw / unit) * unit
  }));

  let sum = rounded.reduce((acc, s) => acc + s.rounded, 0);
  let diff = total - sum;

  rounded.sort((a, b) => b.remainder - a.remainder);

  let i = 0;
  while (diff > 0 && i < rounded.length) {
    rounded[i].rounded += unit;
    diff -= unit;
    i++;
  }

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

function calculateSettlement(party) {
  const participants = party.participants;
  const items = party.items;
  const { roundUnit, roundMode, taxDefault } = party.settings;

  if (participants.length === 0) {
    return { breakdown: {}, payments: [], total: 0 };
  }

  const paid = {};
  const shouldPay = {};

  participants.forEach(p => {
    paid[p.id] = 0;
    shouldPay[p.id] = 0;
  });

  let grandTotal = 0;

  items.forEach(item => {
    const taxRate = item.tax ?? taxDefault;
    const subtotal = item.amountMinor * (item.qty || 1);
    const withTax = Math.round(subtotal * (1 + taxRate / 100));
    grandTotal += withTax;

    if (item.payerId && paid[item.payerId] !== undefined) {
      paid[item.payerId] += withTax;
    }

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

    const shareRaw = withTax / targets.length;
    const shares = targets.map(id => ({ id, raw: shareRaw }));
    const distributed = distributeRemainder(shares, withTax, roundUnit);

    Object.entries(distributed).forEach(([id, amount]) => {
      shouldPay[id] = (shouldPay[id] || 0) + amount;
    });
  });

  const totalShouldPay = Object.values(shouldPay).reduce((a, b) => a + b, 0);
  if (totalShouldPay !== grandTotal) {
    const diff = grandTotal - totalShouldPay;
    const firstId = participants[0]?.id;
    if (firstId) {
      shouldPay[firstId] += diff;
    }
  }

  const balance = {};
  participants.forEach(p => {
    balance[p.id] = paid[p.id] - shouldPay[p.id];
  });

  const payments = calculateMinimumPayments(balance, participants);

  return {
    breakdown: participants.map(p => ({
      id: p.id,
      name: p.name,
      paid: paid[p.id],
      shouldPay: shouldPay[p.id],
      balance: balance[p.id]
    })),
    payments,
    total: grandTotal
  };
}

function calculateMinimumPayments(balance, participants) {
  const creditors = [];
  const debtors = [];

  Object.entries(balance).forEach(([id, amount]) => {
    if (amount > 0) {
      creditors.push({ id, amount });
    } else if (amount < 0) {
      debtors.push({ id, amount: -amount });
    }
  });

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
// テストユーティリティ
// =====================================================

let testCount = 0;
let passCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`✓ Test ${testCount}: ${message}`);
  } else {
    console.error(`✗ Test ${testCount}: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (expected: ${expected}, actual: ${actual})`);
}

function assertArrayEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  assert(actualStr === expectedStr, `${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
}

// =====================================================
// テストケース
// =====================================================

console.log('========================================');
console.log('割り勘ツール - テストケース実行');
console.log('========================================\n');

// テスト1: 基本的な等分割（3人で1000円を等分）
console.log('【テスト1】基本的な等分割（3人で1000円を等分）');
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: 'ラーメン', amountMinor: 1000, qty: 1, tax: 0, payerId: 'A', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest', taxDefault: 0 }
  };
  
  const result = calculateSettlement(party);
  assertEqual(result.total, 1000, '合計は1000円');
  assertEqual(result.breakdown.find(b => b.id === 'A').paid, 1000, 'Aが1000円立て替え');
  assertEqual(result.breakdown.find(b => b.id === 'A').shouldPay, 333 + 1, 'Aの負担額は333+1=334円（端数調整）');
  assertEqual(result.breakdown.find(b => b.id === 'B').shouldPay, 333, 'Bの負担額は333円');
  assertEqual(result.breakdown.find(b => b.id === 'C').shouldPay, 333, 'Cの負担額は333円');
}
console.log('');

// テスト2: 複数アイテム・複数税率
console.log('【テスト2】複数アイテム・複数税率');
{
  const party = {
    participants: [
      { id: 'A', name: 'Alice' },
      { id: 'B', name: 'Bob' }
    ],
    items: [
      { id: 'i1', name: 'ビール（税10%）', amountMinor: 1000, qty: 1, tax: 10, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: 'おつまみ（税8%）', amountMinor: 500, qty: 1, tax: 8, payerId: 'B', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest', taxDefault: 0 }
  };
  
  const result = calculateSettlement(party);
  const taxedBeer = Math.round(1000 * 1.1);   // 1100
  const taxedSnack = Math.round(500 * 1.08);  // 540
  const expectedTotal = taxedBeer + taxedSnack;  // 1640
  
  assertEqual(result.total, expectedTotal, `合計は${expectedTotal}円`);
  assertEqual(result.breakdown.find(b => b.id === 'A').paid, taxedBeer, `Aが${taxedBeer}円立て替え`);
  assertEqual(result.breakdown.find(b => b.id === 'B').paid, taxedSnack, `Bが${taxedSnack}円立て替え`);
}
console.log('');

// テスト3: 個別選択（AとBだけで按分、Cは対象外）
console.log('【テスト3】個別選択（AとBだけで按分、Cは対象外）');
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: '酒', amountMinor: 1000, qty: 1, tax: 0, payerId: 'A', mode: 'selected', selection: ['A', 'B'] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest', taxDefault: 0 }
  };
  
  const result = calculateSettlement(party);
  assertEqual(result.total, 1000, '合計は1000円');
  assertEqual(result.breakdown.find(b => b.id === 'A').shouldPay, 500, 'Aの負担額は500円');
  assertEqual(result.breakdown.find(b => b.id === 'B').shouldPay, 500, 'Bの負担額は500円');
  assertEqual(result.breakdown.find(b => b.id === 'C').shouldPay, 0, 'Cの負担額は0円');
}
console.log('');

// テスト4: 支払い相殺（Aが多く支払っても、Bが多く負担していれば逆向き送金）
console.log('【テスト4】支払い相殺（複数アイテムでの逆向き送金）');
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' }
    ],
    items: [
      { id: 'i1', name: 'ラーメン', amountMinor: 100, qty: 1, tax: 0, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: 'ビール', amountMinor: 1000, qty: 1, tax: 0, payerId: 'B', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest', taxDefault: 0 }
  };
  
  const result = calculateSettlement(party);
  const aBalance = result.breakdown.find(b => b.id === 'A').balance;
  const bBalance = result.breakdown.find(b => b.id === 'B').balance;
  
  // A: paid=100, shouldPay=550 → balance=-450（払う方）
  // B: paid=1000, shouldPay=550 → balance=+450（受け取る方）
  assertEqual(aBalance, -450, 'Aの差額は-450円（払う方）');
  assertEqual(bBalance, 450, 'Bの差額は+450円（受け取る方）');
  
  // payments: BがAに450円送金、ではなくAがBに450円送金
  const payment = result.payments[0];
  assertEqual(payment.from, 'A', '送金元はA');
  assertEqual(payment.to, 'B', '送金先はB');
  assertEqual(payment.amountMinor, 450, '送金額は450円');
}
console.log('');

// テスト5: 端数調整（1円単位での丸め）
console.log('【テスト5】端数調整（1円単位での丸め）');
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: '食事', amountMinor: 1000, qty: 1, tax: 8, payerId: 'A', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest', taxDefault: 0 }
  };
  
  const result = calculateSettlement(party);
  const taxedAmount = Math.round(1000 * 1.08);  // 1080
  assertEqual(result.total, taxedAmount, `合計は${taxedAmount}円`);
  
  const totalShouldPay = result.breakdown.reduce((acc, b) => acc + b.shouldPay, 0);
  assertEqual(totalShouldPay, result.total, '全員の負担額合計は支払い合計と一致');
}
console.log('');

// テスト6: 複数送金が必要な場合（複数人間での相殺）
console.log('【テスト6】複数送金が必要な場合（3人でのマッチング）');
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: '食事A', amountMinor: 1000, qty: 1, tax: 0, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: '食事B', amountMinor: 2000, qty: 1, tax: 0, payerId: 'B', mode: 'equal', selection: [] },
      { id: 'i3', name: '食事C', amountMinor: 100, qty: 1, tax: 0, payerId: 'C', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest', taxDefault: 0 }
  };
  
  const result = calculateSettlement(party);
  // 合計: 3100円、3人で等分 → 各自1033円+1033円+1034円=3100円
  assertEqual(result.total, 3100, '合計は3100円');
  
  // A: paid=1000, shouldPay≈1033
  // B: paid=2000, shouldPay≈1033
  // C: paid=100, shouldPay≈1034
  const aBalance = result.breakdown.find(b => b.id === 'A').balance;
  const payments = result.payments;
  assert(payments.length > 0, '複数の送金が必要');
  
  // 全ての送金の合計が均衡すること
  const totalPayment = payments.reduce((acc, p) => acc + p.amountMinor, 0);
  const maxBalance = Math.max(...result.breakdown.map(b => Math.abs(b.balance)));
  assertEqual(totalPayment, maxBalance, '全送金額が最大差額と一致');
}
console.log('');

// テスト7: 送金が不要な場合（全員が等分で支払った場合）
console.log('【テスト7】送金が不要な場合（全員等額支払い）');
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' }
    ],
    items: [
      { id: 'i1', name: '食事', amountMinor: 1000, qty: 1, tax: 0, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: '食事', amountMinor: 1000, qty: 1, tax: 0, payerId: 'B', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest', taxDefault: 0 }
  };
  
  const result = calculateSettlement(party);
  assertEqual(result.total, 2000, '合計は2000円');
  assertEqual(result.breakdown.find(b => b.id === 'A').balance, 0, 'Aの差額は0円（相殺）');
  assertEqual(result.breakdown.find(b => b.id === 'B').balance, 0, 'Bの差額は0円（相殺）');
  assertEqual(result.payments.length, 0, '送金不要');
}
console.log('');

// テスト8: 数量と税率の組み合わせ
console.log('【テスト8】数量と税率の組み合わせ');
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' }
    ],
    items: [
      { id: 'i1', name: 'ビール', amountMinor: 500, qty: 2, tax: 10, payerId: 'A', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest', taxDefault: 0 }
  };
  
  const result = calculateSettlement(party);
  const subtotal = 500 * 2;  // 1000
  const withTax = Math.round(subtotal * 1.1);  // 1100
  assertEqual(result.total, withTax, `合計は${withTax}円`);
  assertEqual(result.breakdown.find(b => b.id === 'A').paid, withTax, `Aが${withTax}円立て替え`);
}
console.log('');

// =====================================================
// テスト結果
// =====================================================

console.log('========================================');
console.log(`テスト結果: ${passCount}/${testCount} 成功`);
console.log('========================================');

if (passCount === testCount) {
  console.log('✓ すべてのテストが成功しました！');
  process.exit(0);
} else {
  console.log(`✗ ${testCount - passCount}個のテストが失敗しました。`);
  process.exit(1);
}
