/**
 * 割り勘チE�Eル - チE��トケース
 * 褁E��な割り勘計算が正確に行われることをテスチE
 */

// =====================================================
// 計算関数をエクスポ�Eト可能にするために、Node.js環墁E��の実行に対忁E
// =====================================================

// チE��ト用の計算関数をこのファイルにコピ�E
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
  const { roundUnit, roundMode } = party.settings;

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
    const subtotal = item.amountMinor * (item.qty || 1);
    grandTotal += subtotal;

    if (item.payerId && paid[item.payerId] !== undefined) {
      paid[item.payerId] += subtotal;
    }

    let targets = [];
    switch (item.mode) {
      case 'selected':
        targets = (item.selection || []).filter(id => participants.some(p => p.id === id));
        break;
      case 'equal':
      default:
        // If selection exists even in equal mode, prefer selected targets
        if (item.selection && Array.isArray(item.selection) && item.selection.length > 0) {
          targets = (item.selection || []).filter(id => participants.some(p => p.id === id));
        } else {
          targets = participants.map(p => p.id);
        }
        break;
    }

    if (targets.length === 0) {
      targets = participants.map(p => p.id);
    }

    const shareRaw = subtotal / targets.length;
    const shares = targets.map(id => ({ id, raw: shareRaw }));
    const distributed = distributeRemainder(shares, subtotal, roundUnit);

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
// チE��トユーチE��リチE��
// =====================================================

let testCount = 0;
let passCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`✁ETest ${testCount}: ${message}`);
  } else {
    console.error(`✁ETest ${testCount}: ${message}`);
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
// チE��トケース
// =====================================================

console.log('========================================');
console.log('割り勘チE�Eル - チE��トケース実衁E);
console.log('========================================\n');

// チE��チE: 基本皁E��等�E割�E�E人で1000冁E��等�E�E�E
console.log('【テスチE】基本皁E��等�E割�E�E人で1000冁E��等�E�E�E);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: 'ラーメン', amountMinor: 1000, qty: 1, payerId: 'A', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  assertEqual(result.total, 1000, '合計�E1000冁E);
  assertEqual(result.breakdown.find(b => b.id === 'A').paid, 1000, 'AぁE000冁E��て替ぁE);
  assertEqual(result.breakdown.find(b => b.id === 'A').shouldPay, 333 + 1, 'Aの負拁E���E333+1=334冁E��端数調整�E�E);
  assertEqual(result.breakdown.find(b => b.id === 'B').shouldPay, 333, 'Bの負拁E���E333冁E);
  assertEqual(result.breakdown.find(b => b.id === 'C').shouldPay, 333, 'Cの負拁E���E333冁E);
}
console.log('');

// チE��チE: 褁E��アイチE��
console.log('【テスチE】褁E��アイチE��');
{
  const party = {
    participants: [
      { id: 'A', name: 'Alice' },
      { id: 'B', name: 'Bob' }
    ],
    items: [
      { id: 'i1', name: 'ビ�Eル', amountMinor: 1000, qty: 1, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: 'おつまみ', amountMinor: 500, qty: 1, payerId: 'B', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest' }
  };
  
  const result = calculateSettlement(party);
  const expectedTotal = 1000 + 500;  // 1500
  
  assertEqual(result.total, expectedTotal, `合計�E${expectedTotal}冁E);
  assertEqual(result.breakdown.find(b => b.id === 'A').paid, 1000, `AぁE000冁E��て替ぁE);
  assertEqual(result.breakdown.find(b => b.id === 'B').paid, 500, `BぁE00冁E��て替ぁE);
}
console.log('');

// チE��チE: 個別選択！EとBだけで按�E、Cは対象外！E
console.log('【テスチE】個別選択！EとBだけで按�E、Cは対象外！E);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: '酁E, amountMinor: 1000, qty: 1, payerId: 'A', mode: 'selected', selection: ['A', 'B'] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest' }
  };
  
  const result = calculateSettlement(party);
  assertEqual(result.total, 1000, '合計�E1000冁E);
  assertEqual(result.breakdown.find(b => b.id === 'A').shouldPay, 500, 'Aの負拁E���E500冁E);
  assertEqual(result.breakdown.find(b => b.id === 'B').shouldPay, 500, 'Bの負拁E���E500冁E);
  assertEqual(result.breakdown.find(b => b.id === 'C').shouldPay, 0, 'Cの負拁E���E0冁E);
}
console.log('');

// チE��チE: 支払い相殺�E�Eが多く支払っても、Bが多く負拁E��てぁE��ば送E��き送E�߁E�E
console.log('【テスチE】支払い相殺�E�褁E��アイチE��での送E��き送E�߁E�E);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' }
    ],
    items: [
      { id: 'i1', name: 'ラーメン', amountMinor: 100, qty: 1, tax: 0, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: 'ビ�Eル', amountMinor: 1000, qty: 1, tax: 0, payerId: 'B', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  const aBalance = result.breakdown.find(b => b.id === 'A').balance;
  const bBalance = result.breakdown.find(b => b.id === 'B').balance;
  
  // A: paid=100, shouldPay=550 ↁEbalance=-450�E�払ぁE���E�E
  // B: paid=1000, shouldPay=550 ↁEbalance=+450�E�受け取る方�E�E
  assertEqual(aBalance, -450, 'Aの差額�E-450冁E��払ぁE���E�E);
  assertEqual(bBalance, 450, 'Bの差額�E+450冁E��受け取る方�E�E);
  
  // payments: BがAに450冁E��E��、ではなくAがBに450冁E��E��
  const payment = result.payments[0];
  assertEqual(payment.from, 'A', '送E��允E�EA');
  assertEqual(payment.to, 'B', '送E��先�EB');
  assertEqual(payment.amountMinor, 450, '送E��額�E450冁E);
}
console.log('');

// チE��チE: 端数調整�E�E冁E��位での丸めE��E
console.log('【テスチE】端数調整�E�E冁E��位での丸めE��E);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: '食亁E, amountMinor: 1000, qty: 1, tax: 8, payerId: 'A', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  const taxedAmount = Math.round(1000 * 1.08);  // 1080
  assertEqual(result.total, taxedAmount, `合計�E${taxedAmount}冁E);
  
  const totalShouldPay = result.breakdown.reduce((acc, b) => acc + b.shouldPay, 0);
  assertEqual(totalShouldPay, result.total, '全員の負拁E��合計�E支払い合計と一致');
}
console.log('');

// チE��チE: 褁E��送E��が忁E��な場合（褁E��人間での相殺�E�E
console.log('【テスチE】褁E��送E��が忁E��な場合！E人でのマッチング�E�E);
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
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  // 合訁E 3100冁E��E人で等�E ↁE吁E�E1033冁E1033冁E1034冁E3100冁E
  assertEqual(result.total, 3100, '合計�E3100冁E);
  
  // A: paid=1000, shouldPay≁E033
  // B: paid=2000, shouldPay≁E033
  // C: paid=100, shouldPay≁E034
  const aBalance = result.breakdown.find(b => b.id === 'A').balance;
  const payments = result.payments;
  assert(payments.length > 0, '褁E��の送E��が忁E��E);
  
  // 全ての送E��の合計が坁E��すること
  const totalPayment = payments.reduce((acc, p) => acc + p.amountMinor, 0);
  const maxBalance = Math.max(...result.breakdown.map(b => Math.abs(b.balance)));
  assertEqual(totalPayment, maxBalance, '全送E��額が最大差額と一致');
}
console.log('');

// チE��チE: 送E��が不要な場合（�E員が等�Eで支払った場合！E
console.log('【テスチE】送E��が不要な場合（�E員等額支払い�E�E);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' }
    ],
    items: [
      { id: 'i1', name: '食亁E, amountMinor: 1000, qty: 1, tax: 0, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: '食亁E, amountMinor: 1000, qty: 1, tax: 0, payerId: 'B', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  assertEqual(result.total, 2000, '合計�E2000冁E);
  assertEqual(result.breakdown.find(b => b.id === 'A').balance, 0, 'Aの差額�E0冁E��相殺�E�E);
  assertEqual(result.breakdown.find(b => b.id === 'B').balance, 0, 'Bの差額�E0冁E��相殺�E�E);
  assertEqual(result.payments.length, 0, '送E��不要E);
}
console.log('');

// チE��チE: 数量と税率の絁E��合わぁE
console.log('【テスチE】数量と税率の絁E��合わぁE);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' }
    ],
    items: [
      { id: 'i1', name: 'ビ�Eル', amountMinor: 500, qty: 2, tax: 10, payerId: 'A', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  const subtotal = 500 * 2;  // 1000
  const withTax = Math.round(subtotal * 1.1);  // 1100
  assertEqual(result.total, withTax, `合計�E${withTax}冁E);
  assertEqual(result.breakdown.find(b => b.id === 'A').paid, withTax, `AぁE{withTax}冁E��て替ぁE);
}
console.log('');

// チェック: 等分モードでも選択対象がある場合はその対象だけで按分される
console.log('【テスト】等分モードで選択対象がある場合に選択者のみで割ること');
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' },
      { id: 'D', name: 'D' },
      { id: 'E', name: 'E' }
    ],
    items: [
      // 等分モードだが selection が指定されている（A,B,C のみ対象）
      { id: 'iX', name: '特定注文', amountMinor: 900, qty: 1, payerId: 'A', mode: 'equal', selection: ['A','B','C'] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest' }
  };

  const result = calculateSettlement(party);
  assertEqual(result.total, 900, '合計は900であること');
  assertEqual(result.breakdown.find(b => b.id === 'A').shouldPay, 300, 'Aは300負担');
  assertEqual(result.breakdown.find(b => b.id === 'B').shouldPay, 300, 'Bは300負担');
  assertEqual(result.breakdown.find(b => b.id === 'C').shouldPay, 300, 'Cは300負担');
  assertEqual(result.breakdown.find(b => b.id === 'D').shouldPay, 0, 'Dは0負担');
  assertEqual(result.breakdown.find(b => b.id === 'E').shouldPay, 0, 'Eは0負担');
}
console.log('');

// チェック: 複数人立て替え時に送金が最小化される（相殺最適化）
console.log('【テスト】複数人立て替え＆送金相殺最適化：各自の送金が1回で完結');
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' },
      { id: 'D', name: 'D' }
    ],
    items: [
      { id: 'i1', name: 'ランチ', amountMinor: 1000, qty: 1, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: '飲料', amountMinor: 1200, qty: 1, payerId: 'B', mode: 'equal', selection: [] },
      { id: 'i3', name: 'デザート', amountMinor: 800, qty: 1, payerId: 'C', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest' }
  };

  const result = calculateSettlement(party);
  // 合計: 3000円、一人あたり: 750円
  // A: paid=1000, shouldPay=750 → balance=+250（受取）
  // B: paid=1200, shouldPay=750 → balance=+450（受取）
  // C: paid=800, shouldPay=750 → balance=+50（受取）
  // D: paid=0, shouldPay=750 → balance=-750（支払）
  
  assertEqual(result.total, 3000, '合計は3000');
  assertEqual(result.breakdown.find(b => b.id === 'A').balance, 250, 'Aは250受け取る');
  assertEqual(result.breakdown.find(b => b.id === 'B').balance, 450, 'Bは450受け取る');
  assertEqual(result.breakdown.find(b => b.id === 'C').balance, 50, 'Cは50受け取る');
  assertEqual(result.breakdown.find(b => b.id === 'D').balance, -750, 'Dは750支払う');
  
  // 送金は最小化される：Dが3人に送金（3本）
  assertEqual(result.payments.length, 3, '送金本数は3本（相殺最適化）');
  assertEqual(result.payments[0].from, 'D', 'D → ');
  assertEqual(result.payments[0].to, 'B', 'D → B (450円)');
  assertEqual(result.payments[0].amountMinor, 450, 'D → B: 450円');
  assertEqual(result.payments[1].to, 'A', 'D → A (250円)');
  assertEqual(result.payments[1].amountMinor, 250, 'D → A: 250円');
  assertEqual(result.payments[2].to, 'C', 'D → C (50円)');
  assertEqual(result.payments[2].amountMinor, 50, 'D → C: 50円');
}
console.log('');

// =====================================================
// チE��ト結果
// =====================================================

console.log('========================================');
console.log(`チE��ト結果: ${passCount}/${testCount} 成功`);
console.log('========================================');

if (passCount === testCount) {
  console.log('✁EすべてのチE��トが成功しました�E�E);
  process.exit(0);
} else {
  console.log(`✁E${testCount - passCount}個�EチE��トが失敗しました。`);
  process.exit(1);
}
