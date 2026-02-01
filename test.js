/**
 * 蜑ｲ繧雁鋸繝・・繝ｫ - 繝・せ繝医こ繝ｼ繧ｹ
 * 隍・尅縺ｪ蜑ｲ繧雁鋸險育ｮ励′豁｣遒ｺ縺ｫ陦後ｏ繧後ｋ縺薙→繧偵ユ繧ｹ繝・
 */

// =====================================================
// 險育ｮ鈴未謨ｰ繧偵お繧ｯ繧ｹ繝昴・繝亥庄閭ｽ縺ｫ縺吶ｋ縺溘ａ縺ｫ縲¨ode.js迺ｰ蠅・〒縺ｮ螳溯｡後↓蟇ｾ蠢・
// =====================================================

// 繝・せ繝育畑縺ｮ險育ｮ鈴未謨ｰ繧偵％縺ｮ繝輔ぃ繧､繝ｫ縺ｫ繧ｳ繝斐・
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
        targets = participants.map(p => p.id);
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
// 繝・せ繝医Θ繝ｼ繝・ぅ繝ｪ繝・ぅ
// =====================================================

let testCount = 0;
let passCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`笨・Test ${testCount}: ${message}`);
  } else {
    console.error(`笨・Test ${testCount}: ${message}`);
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
// 繝・せ繝医こ繝ｼ繧ｹ
// =====================================================

console.log('========================================');
console.log('蜑ｲ繧雁鋸繝・・繝ｫ - 繝・せ繝医こ繝ｼ繧ｹ螳溯｡・);
console.log('========================================\n');

// 繝・せ繝・: 蝓ｺ譛ｬ逧・↑遲牙・蜑ｲ・・莠ｺ縺ｧ1000蜀・ｒ遲牙・・・
console.log('縲舌ユ繧ｹ繝・縲大渕譛ｬ逧・↑遲牙・蜑ｲ・・莠ｺ縺ｧ1000蜀・ｒ遲牙・・・);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: '繝ｩ繝ｼ繝｡繝ｳ', amountMinor: 1000, qty: 1, payerId: 'A', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  assertEqual(result.total, 1000, '蜷郁ｨ医・1000蜀・);
  assertEqual(result.breakdown.find(b => b.id === 'A').paid, 1000, 'A縺・000蜀・ｫ九※譖ｿ縺・);
  assertEqual(result.breakdown.find(b => b.id === 'A').shouldPay, 333 + 1, 'A縺ｮ雋諡・｡阪・333+1=334蜀・ｼ育ｫｯ謨ｰ隱ｿ謨ｴ・・);
  assertEqual(result.breakdown.find(b => b.id === 'B').shouldPay, 333, 'B縺ｮ雋諡・｡阪・333蜀・);
  assertEqual(result.breakdown.find(b => b.id === 'C').shouldPay, 333, 'C縺ｮ雋諡・｡阪・333蜀・);
}
console.log('');

// 繝・せ繝・: 隍・焚繧｢繧､繝・Β
console.log('縲舌ユ繧ｹ繝・縲題､・焚繧｢繧､繝・Β');
{
  const party = {
    participants: [
      { id: 'A', name: 'Alice' },
      { id: 'B', name: 'Bob' }
    ],
    items: [
      { id: 'i1', name: '繝薙・繝ｫ', amountMinor: 1000, qty: 1, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: '縺翫▽縺ｾ縺ｿ', amountMinor: 500, qty: 1, payerId: 'B', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest' }
  };
  
  const result = calculateSettlement(party);
  const expectedTotal = 1000 + 500;  // 1500
  
  assertEqual(result.total, expectedTotal, `蜷郁ｨ医・${expectedTotal}蜀・);
  assertEqual(result.breakdown.find(b => b.id === 'A').paid, 1000, `A縺・000蜀・ｫ九※譖ｿ縺・);
  assertEqual(result.breakdown.find(b => b.id === 'B').paid, 500, `B縺・00蜀・ｫ九※譖ｿ縺・);
}
console.log('');

// 繝・せ繝・: 蛟句挨驕ｸ謚橸ｼ・縺ｨB縺縺代〒謖牙・縲，縺ｯ蟇ｾ雎｡螟厄ｼ・
console.log('縲舌ユ繧ｹ繝・縲大句挨驕ｸ謚橸ｼ・縺ｨB縺縺代〒謖牙・縲，縺ｯ蟇ｾ雎｡螟厄ｼ・);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: '驟・, amountMinor: 1000, qty: 1, payerId: 'A', mode: 'selected', selection: ['A', 'B'] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest' }
  };
  
  const result = calculateSettlement(party);
  assertEqual(result.total, 1000, '蜷郁ｨ医・1000蜀・);
  assertEqual(result.breakdown.find(b => b.id === 'A').shouldPay, 500, 'A縺ｮ雋諡・｡阪・500蜀・);
  assertEqual(result.breakdown.find(b => b.id === 'B').shouldPay, 500, 'B縺ｮ雋諡・｡阪・500蜀・);
  assertEqual(result.breakdown.find(b => b.id === 'C').shouldPay, 0, 'C縺ｮ雋諡・｡阪・0蜀・);
}
console.log('');

// 繝・せ繝・: 謾ｯ謇輔＞逶ｸ谿ｺ・・縺悟､壹￥謾ｯ謇輔▲縺ｦ繧ゅ。縺悟､壹￥雋諡・＠縺ｦ縺・ｌ縺ｰ騾・髄縺埼・≡・・
console.log('縲舌ユ繧ｹ繝・縲第髪謇輔＞逶ｸ谿ｺ・郁､・焚繧｢繧､繝・Β縺ｧ縺ｮ騾・髄縺埼・≡・・);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' }
    ],
    items: [
      { id: 'i1', name: '繝ｩ繝ｼ繝｡繝ｳ', amountMinor: 100, qty: 1, tax: 0, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: '繝薙・繝ｫ', amountMinor: 1000, qty: 1, tax: 0, payerId: 'B', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  const aBalance = result.breakdown.find(b => b.id === 'A').balance;
  const bBalance = result.breakdown.find(b => b.id === 'B').balance;
  
  // A: paid=100, shouldPay=550 竊・balance=-450・域鴛縺・婿・・
  // B: paid=1000, shouldPay=550 竊・balance=+450・亥女縺大叙繧区婿・・
  assertEqual(aBalance, -450, 'A縺ｮ蟾ｮ鬘阪・-450蜀・ｼ域鴛縺・婿・・);
  assertEqual(bBalance, 450, 'B縺ｮ蟾ｮ鬘阪・+450蜀・ｼ亥女縺大叙繧区婿・・);
  
  // payments: B縺窟縺ｫ450蜀・・≡縲√〒縺ｯ縺ｪ縺就縺沓縺ｫ450蜀・・≡
  const payment = result.payments[0];
  assertEqual(payment.from, 'A', '騾・≡蜈・・A');
  assertEqual(payment.to, 'B', '騾・≡蜈医・B');
  assertEqual(payment.amountMinor, 450, '騾・≡鬘阪・450蜀・);
}
console.log('');

// 繝・せ繝・: 遶ｯ謨ｰ隱ｿ謨ｴ・・蜀・腰菴阪〒縺ｮ荳ｸ繧・ｼ・
console.log('縲舌ユ繧ｹ繝・縲醍ｫｯ謨ｰ隱ｿ謨ｴ・・蜀・腰菴阪〒縺ｮ荳ｸ繧・ｼ・);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: '鬟滉ｺ・, amountMinor: 1000, qty: 1, tax: 8, payerId: 'A', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  const taxedAmount = Math.round(1000 * 1.08);  // 1080
  assertEqual(result.total, taxedAmount, `蜷郁ｨ医・${taxedAmount}蜀・);
  
  const totalShouldPay = result.breakdown.reduce((acc, b) => acc + b.shouldPay, 0);
  assertEqual(totalShouldPay, result.total, '蜈ｨ蜩｡縺ｮ雋諡・｡榊粋險医・謾ｯ謇輔＞蜷郁ｨ医→荳閾ｴ');
}
console.log('');

// 繝・せ繝・: 隍・焚騾・≡縺悟ｿ・ｦ√↑蝣ｴ蜷茨ｼ郁､・焚莠ｺ髢薙〒縺ｮ逶ｸ谿ｺ・・
console.log('縲舌ユ繧ｹ繝・縲題､・焚騾・≡縺悟ｿ・ｦ√↑蝣ｴ蜷茨ｼ・莠ｺ縺ｧ縺ｮ繝槭ャ繝√Φ繧ｰ・・);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    items: [
      { id: 'i1', name: '鬟滉ｺ帰', amountMinor: 1000, qty: 1, tax: 0, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: '鬟滉ｺ毅', amountMinor: 2000, qty: 1, tax: 0, payerId: 'B', mode: 'equal', selection: [] },
      { id: 'i3', name: '鬟滉ｺ気', amountMinor: 100, qty: 1, tax: 0, payerId: 'C', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  // 蜷郁ｨ・ 3100蜀・・莠ｺ縺ｧ遲牙・ 竊・蜷・・1033蜀・1033蜀・1034蜀・3100蜀・
  assertEqual(result.total, 3100, '蜷郁ｨ医・3100蜀・);
  
  // A: paid=1000, shouldPay竕・033
  // B: paid=2000, shouldPay竕・033
  // C: paid=100, shouldPay竕・034
  const aBalance = result.breakdown.find(b => b.id === 'A').balance;
  const payments = result.payments;
  assert(payments.length > 0, '隍・焚縺ｮ騾・≡縺悟ｿ・ｦ・);
  
  // 蜈ｨ縺ｦ縺ｮ騾・≡縺ｮ蜷郁ｨ医′蝮・｡｡縺吶ｋ縺薙→
  const totalPayment = payments.reduce((acc, p) => acc + p.amountMinor, 0);
  const maxBalance = Math.max(...result.breakdown.map(b => Math.abs(b.balance)));
  assertEqual(totalPayment, maxBalance, '蜈ｨ騾・≡鬘阪′譛螟ｧ蟾ｮ鬘阪→荳閾ｴ');
}
console.log('');

// 繝・せ繝・: 騾・≡縺御ｸ崎ｦ√↑蝣ｴ蜷茨ｼ亥・蜩｡縺檎ｭ牙・縺ｧ謾ｯ謇輔▲縺溷ｴ蜷茨ｼ・
console.log('縲舌ユ繧ｹ繝・縲鷹・≡縺御ｸ崎ｦ√↑蝣ｴ蜷茨ｼ亥・蜩｡遲蛾｡肴髪謇輔＞・・);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' }
    ],
    items: [
      { id: 'i1', name: '鬟滉ｺ・, amountMinor: 1000, qty: 1, tax: 0, payerId: 'A', mode: 'equal', selection: [] },
      { id: 'i2', name: '鬟滉ｺ・, amountMinor: 1000, qty: 1, tax: 0, payerId: 'B', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  assertEqual(result.total, 2000, '蜷郁ｨ医・2000蜀・);
  assertEqual(result.breakdown.find(b => b.id === 'A').balance, 0, 'A縺ｮ蟾ｮ鬘阪・0蜀・ｼ育嶌谿ｺ・・);
  assertEqual(result.breakdown.find(b => b.id === 'B').balance, 0, 'B縺ｮ蟾ｮ鬘阪・0蜀・ｼ育嶌谿ｺ・・);
  assertEqual(result.payments.length, 0, '騾・≡荳崎ｦ・);
}
console.log('');

// 繝・せ繝・: 謨ｰ驥上→遞守紫縺ｮ邨・∩蜷医ｏ縺・
console.log('縲舌ユ繧ｹ繝・縲第焚驥上→遞守紫縺ｮ邨・∩蜷医ｏ縺・);
{
  const party = {
    participants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' }
    ],
    items: [
      { id: 'i1', name: '繝薙・繝ｫ', amountMinor: 500, qty: 2, tax: 10, payerId: 'A', mode: 'equal', selection: [] }
    ],
    settings: { roundUnit: 1, roundMode: 'nearest',  }
  };
  
  const result = calculateSettlement(party);
  const subtotal = 500 * 2;  // 1000
  const withTax = Math.round(subtotal * 1.1);  // 1100
  assertEqual(result.total, withTax, `蜷郁ｨ医・${withTax}蜀・);
  assertEqual(result.breakdown.find(b => b.id === 'A').paid, withTax, `A縺・{withTax}蜀・ｫ九※譖ｿ縺・);
}
console.log('');

// =====================================================
// 繝・せ繝育ｵ先棡
// =====================================================

console.log('========================================');
console.log(`繝・せ繝育ｵ先棡: ${passCount}/${testCount} 謌仙粥`);
console.log('========================================');

if (passCount === testCount) {
  console.log('笨・縺吶∋縺ｦ縺ｮ繝・せ繝医′謌仙粥縺励∪縺励◆・・);
  process.exit(0);
} else {
  console.log(`笨・${testCount - passCount}蛟九・繝・せ繝医′螟ｱ謨励＠縺ｾ縺励◆縲Ａ);
  process.exit(1);
}
