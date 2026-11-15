/* 纸面组合 PAPER PORTFOLIO — 把账本的方向判断折算成模拟盈亏
 * 规则（v1.0，2026-11-15 立）：
 *   1. 只有带 rule.symbol 的账本条目才入场；入场价 = 发帖日收盘（东财/腾讯 K 线，已核对）
 *   2. 方向由规则隐含：op 为 < / <= → 看跌（做空该标的）；> / >= → 看涨（做多）
 *   3. 止损距离 = |入场价 - 规则阈值| / 入场价；低于 3% 时按 8% 兜底（阈值贴着入场价的条目无有效止损）
 *   4. 单笔风险 = 2% 权益，名义仓位 = 2% / 止损距离，上限 25% 权益
 *   5. 全部按初始本金 100 万计仓位（不做复利叠加），只算价格变动，不含费用、滑点、融资成本
 *   6. 全是模拟，不构成投资建议；mark 每日刷新，由 07:30 任务写入
 */
window.__PAPER__ = {
  version: '1.0',
  asOf: '2026-11-13',
  capital: 1000000,
  riskPerTrade: 0.02,
  maxPosition: 0.25,
  defaultStop: 0.08,
  minStop: 0.03,
  caps: { total: 1.0, perDir: 0.6, perSymbol: 0.25, perFactor: 0.4 },
  costs: { slippagePerSide: 0.0005, financingAnnual: 0.03 },
  // 汇率：所有收益按人民币口径。非人民币标的按「入场日汇率 → 标价日汇率」折算，
  // 敞口方向与仓位方向一致（做多美元资产=做多美元，做空=做空美元）。
  fx: {
    base: 'CNY',
    pair: 'USDCNH',
    src: '东方财富 133.USDCNH 日线（离岸人民币）',
    asOf: '2026-11-13',
    rates: {
     
          "2026-08-17": 6.7434,
          "2026-08-18": 6.7469,
          "2026-08-19": 6.7311,
          "2026-08-20": 6.7254,
          "2026-08-21": 6.7214,
          "2026-08-24": 6.7218,
          "2026-08-25": 6.7171,
          "2026-08-26": 6.7225,
          "2026-08-27": 6.7194,
          "2026-08-28": 6.7316,
          "2026-08-31": 6.718,
          "2026-09-01": 6.7223,
          "2026-09-02": 6.7179,
          "2026-09-03": 6.7178,
          "2026-09-04": 6.7079,
          "2026-09-07": 6.7093,
          "2026-09-08": 6.7068,
          "2026-09-09": 6.7065,
          "2026-09-10": 6.7147,
          "2026-09-11": 6.7081,
          "2026-09-14": 6.7095,
          "2026-09-15": 6.7122,
          "2026-09-16": 6.7127,
          "2026-09-17": 6.704,
          "2026-09-18": 6.6953,
          "2026-09-21": 6.6928,
          "2026-09-22": 6.6984,
          "2026-09-23": 6.7115,
          "2026-09-24": 6.7161,
          "2026-09-25": 6.7231,
          "2026-09-28": 6.7126,
          "2026-09-29": 6.7079,
          "2026-09-30": 6.7089,
          "2026-10-01": 6.7143,
          "2026-10-02": 6.7066,
          "2026-10-05": 6.7037,
          "2026-10-06": 6.7016,
          "2026-10-07": 6.7026,
          "2026-10-08": 6.7034,
          "2026-10-09": 6.6929,
          "2026-10-12": 6.6948,
          "2026-10-13": 6.693,
          "2026-10-14": 6.6961,
          "2026-10-15": 6.6895,
          "2026-10-16": 6.686,
          "2026-10-19": 6.6823,
          "2026-10-20": 6.6746,
          "2026-10-21": 6.6743,
          "2026-10-22": 6.6727,
          "2026-10-23": 6.669,
          "2026-10-26": 6.6677,
          "2026-10-27": 6.6647,
          "2026-10-28": 6.6615,
          "2026-10-29": 6.657,
          "2026-10-30": 6.6533,
          "2026-11-02": 6.6473,
          "2026-11-03": 6.6703,
          "2026-11-04": 6.675,
          "2026-11-05": 6.6652,
          "2026-11-06": 6.6738,
          "2026-11-09": 6.6693,
          "2026-11-10": 6.6765,
          "2026-11-11": 6.6738,
          "2026-11-12": 6.6734,
          "2026-11-13": 6.6747
    
    }
  },
  // 宏观因子分组：同一个宏观押注不因换了标的就算分散
  factors: [
    { id: 'aiCapex', name: 'AI 资本开支', symbols: ['usNVDA', 'usAMD', 'usTSM', 'usASML', 'usVRT'], sectors: ['ai'] },
    { id: 'rates', name: '利率与流动性', symbols: ['usIXIC', '100.NDX', 'sz399006', 'sz399001', 'sh000001'] },
    { id: 'commodity', name: '商品与材料', symbols: ['hf_OIL', 'hf_HG', 'hf_SI', 'OIL'], sectors: ['mat', 'energy'] },
    { id: 'crypto', name: '加密与风险偏好', symbols: ['105.IBIT'] },
    { id: 'space', name: '太空与航天', sectors: ['space'] },
    { id: 'bio', name: '生物科技', sectors: ['bio'] },
    { id: 'robot', name: '机器人与自动化', sectors: ['robot'] }
  ],
  note: '纸面组合：账本每条带规则的判断折算一笔模拟仓位，入场价=发帖日收盘，止损距离=规则阈值距入场价，单笔风险 2% 权益；总敞口上限 100%、单方向上限 60%（不加杠杆、不单方向堆仓）。仅模拟，不构成投资建议。',
  positions: [
    {
      id: 'p1', m: 'dalio', date: '2026-10-28', symbol: 'sz399006', name: '创业板指', dir: -1,
      entry: 2634.76, stop: 2634.76, mark: 2426.08,
      thesis: '鹰派暂停≠宽松，反弹难以持续', ruleText: '到期不高于 2634.76 即成立'
    },
    {
      id: 'p2', m: 'druckenmiller', date: '2026-11-06', symbol: 'usNVDA', name: '英伟达', dir: -1,
      entry: 186.64, stop: 186.64, mark: 162.85,
      thesis: 'AI 硬件难言见底，期间会出现更便宜的价格', ruleText: '窗口内最低收盘低于 186.64 即成立'
    },
    {
      id: 'p3', m: 'druckenmiller', date: '2026-11-09', symbol: 'hf_OIL', name: '原油', dir: -1,
      entry: 92.26, stop: 100, mark: 96.29,
      thesis: '供给过剩压过地缘溢价', ruleText: '到期低于 100 即成立'
    },
    {
      id: 'p4', m: 'druckenmiller', date: '2026-11-10', symbol: 'usNVDA', name: '英伟达', dir: -1,
      entry: 168.89, stop: 184.12, mark: 162.85,
      thesis: '反弹不能持续，反弹高点不过前高', ruleText: '窗口内最低收盘不高于 184.12 即成立'
    },
    {
      id: 'p5', m: 'druckenmiller', date: '2026-11-11', symbol: 'usIXIC', name: '纳斯达克', dir: -1,
      entry: 25466.19, stop: 25000, mark: 25136.27,
      thesis: '利率预期不回落，指数守不住 25000', ruleText: '窗口内最低收盘低于 25000 即成立'
    },
    {
      id: 'p6', m: 'druckenmiller', date: '2026-11-12', symbol: 'usNVDA', name: '英伟达', dir: -1,
      entry: 166.19, stop: 150, mark: 162.85,
      thesis: '估值压缩未完成，还有一段下跌', ruleText: '窗口内最低收盘低于 150 即成立'
    },
    {
      id: 'p7', m: 'oneill', date: '2026-11-13', symbol: 'usNVDA', name: '英伟达', dir: 1,
      entry: 162.85, stop: 175, mark: 162.85,
      thesis: '跌到位了，反弹看 175', ruleText: '窗口内最高收盘不低于 175 即成立'
    },
    {
      id: 'p8', m: 'soros', date: '2026-11-15', symbol: '105.IBIT', name: '比特币 ETF', dir: -1,
      entry: null, stop: 36, mark: null, waiting: true,
      thesis: '加密情绪转弱，IBIT 跌破 36', ruleText: '窗口内最低收盘低于 36 即成立（from 2026-11-16 入场）'
    }
  ],
  sources: {
    market: '东方财富 K 线（105.NVDA / 100.NDX / 1.000300）、腾讯行情（sz399006 / hf_OIL）、新浪全球期货日线（OIL）',
    fetchedAt: '2026-11-15 14:20 CST',
    note: 'usIXIC 与 100.NDX 在同一数据源上收盘价一致（11-13 均 25136.27），故用 NDX 日线补全 IXIC 入场价'
  }
};

window.__PAPER__.calc = function () {
  var P = window.__PAPER__;
  var caps = P.caps || { total: 1.0, perDir: 0.6 };
  var costs = P.costs || { slippagePerSide: 0, financingAnnual: 0 };
  var FIDX = window.__FIDX__;
  function factorOf(sym) {
    var fs = P.factors || [];
    for (var i = 0; i < fs.length; i++) {
      if ((fs[i].symbols || []).indexOf(sym) >= 0) return fs[i];
      if (FIDX && fs[i].sectors) {
        for (var j = 0; j < fs[i].sectors.length; j++) {
          var sec = (FIDX.sectors || []).filter(function (s) { return s.id === fs[i].sectors[j]; })[0];
          if (sec && sec.members.indexOf(sym) >= 0) return fs[i];
        }
      }
    }
    return { id: 'other', name: '未归类' };
  }
  var rows = [];
  var rawTotal = 0, rawDir = { '1': 0, '-1': 0 }, rawSym = {}, rawFac = {}, facName = {}, openCount = 0;
  // 第一轮：按单笔风险算出理论仓位（未受组合约束）
  P.positions.forEach(function (p) {
    if (p.waiting || !(p.entry > 0) || !(p.mark > 0)) {
      rows.push({ id: p.id, m: p.m, name: p.name, symbol: p.symbol, dir: p.dir, state: 'waiting', pnl: 0, notional: 0, raw: 0, retPct: 0, stopDist: 0, scale: 0 });
      return;
    }
    var stopDist = Math.abs(p.entry - p.stop) / p.entry;
    if (!(stopDist >= P.minStop)) stopDist = P.defaultStop;
    var raw = Math.min(P.riskPerTrade / stopDist, P.maxPosition) * P.capital;
    var fac = factorOf(p.symbol);
    rawTotal += raw; rawDir[String(p.dir)] += raw; rawSym[p.symbol] = (rawSym[p.symbol] || 0) + raw;
    rawFac[fac.id] = (rawFac[fac.id] || 0) + raw; facName[fac.id] = fac.name; openCount++;
    rows.push({
      id: p.id, m: p.m, name: p.name, symbol: p.symbol, dir: p.dir, state: 'open',
      entry: p.entry, mark: p.mark, stop: p.stop, stopDist: stopDist,
      date: p.date, entryDate: p.date, raw: raw, notional: 0, retPct: 0, pnl: 0, pnlGross: 0, cost: 0, holdDays: 0, scale: 0, waiting: false,
      factor: fac.id, factorName: fac.name
    });
  });
  // 第二轮：组合级约束——总敞口与单方向敞口，超限按同一比例缩仓
  var fTotal = rawTotal > caps.total * P.capital ? (caps.total * P.capital) / rawTotal : 1;
  var fDir = {};
  ['1', '-1'].forEach(function (d) {
    var lim = caps.perDir * P.capital;
    fDir[d] = rawDir[d] > lim ? lim / rawDir[d] : 1;
  });
  // 同一标的多笔（如四笔英伟达）属于同一个风险，按标的总量再缩一次
  var fSym = {};
  Object.keys(rawSym).forEach(function (s) {
    var lim = (caps.perSymbol || 1) * P.capital;
    fSym[s] = rawSym[s] > lim ? lim / rawSym[s] : 1;
  });
  // 同一宏观因子（如做空 AI + 做空纳指）属于同一个押注，按因子总量再缩一次
  var fFac = {};
  Object.keys(rawFac).forEach(function (k) {
    var lim = (caps.perFactor || 1) * P.capital;
    fFac[k] = rawFac[k] > lim ? lim / rawFac[k] : 1;
  });
  var asOfMs = Date.parse(P.asOf + 'T00:00:00Z');
  // 汇率口径：非人民币标的折算成人民币；敞口方向 = 仓位方向（做空美元资产 = 做空美元）
  var fx = P.fx || null;
  function ccyOf(sym) { return /^(sz|sh)/.test(sym || '') ? 'CNY' : 'USD'; }
  function fxRate(date) {
    if (!fx || !fx.rates) return 1;
    if (fx.rates[date] != null) return fx.rates[date];
    var keys = Object.keys(fx.rates).sort(), picked = keys[0];
    for (var i = 0; i < keys.length; i++) { if (keys[i] <= date) picked = keys[i]; }
    return fx.rates[picked];
  }
  var fxMarkDate = fx ? (fx.asOf || P.asOf) : P.asOf;
  var sumPnl = 0, sumGross = 0, sumFx = 0, sumCost = 0, fxExposure = 0, exposure = 0, winCount = 0, expDir = { long: 0, short: 0 }, expFac = {};
  rows.forEach(function (r) {
    if (r.state !== 'open') return;
    var f = Math.min(fTotal, fDir[String(r.dir)], (fSym[r.symbol] === undefined ? 1 : fSym[r.symbol]), (fFac[r.factor] === undefined ? 1 : fFac[r.factor]));
    r.scale = f;
    r.notional = r.raw * f;
    r.retPct = (r.mark / r.entry - 1) * r.dir;
    r.pnlGross = r.notional * r.retPct;
    // 成本：双边滑点 + 持有期融资/借券成本（按年化摊到持有天数）
    var pdate = Date.parse((r.entryDate || r.date || P.asOf) + 'T00:00:00Z');
    var days = isFinite(pdate) && isFinite(asOfMs) ? Math.max(0, Math.round((asOfMs - pdate) / 86400000)) : 0;
    r.holdDays = days;
    r.cost = r.notional * costs.slippagePerSide * 2 + r.notional * costs.financingAnnual * days / 365;
    r.ccy = ccyOf(r.symbol);
    r.fxEntry = r.ccy === 'CNY' ? 1 : fxRate(r.entryDate || r.date || P.asOf);
    r.fxMark = r.ccy === 'CNY' ? 1 : fxRate(fxMarkDate);
    r.fxRet = r.fxMark / r.fxEntry - 1;
    r.pnlFx = r.notional * r.dir * r.fxRet;
    r.pnl = r.pnlGross + r.pnlFx - r.cost;
    sumGross += r.pnlGross; sumFx += r.pnlFx; sumCost += r.cost; sumPnl += r.pnl;
    exposure += r.notional;
    if (r.ccy !== 'CNY') fxExposure += r.notional * r.dir; // 人民币标的没有汇率敞口
    expFac[r.factor] = (expFac[r.factor] || 0) + r.notional;
    if (r.dir > 0) expDir.long += r.notional; else expDir.short += r.notional;
    if (r.pnl > 0.5) winCount++;
  });
  var equity = P.capital + sumPnl;
  return {
    capital: P.capital, equity: equity, pnl: sumPnl, pnlGross: sumGross, cost: sumCost, retPct: sumPnl / P.capital,
    grossRetPct: sumGross / P.capital, costPct: sumCost / P.capital,
    fxPnl: sumFx, fxPct: sumFx / P.capital, fxSens: fxExposure / P.capital,
    fxRateMark: fx ? fxRate(fxMarkDate) : 1, fxSrc: fx ? fx.src : '—', fxAsOf: fx ? fxMarkDate : P.asOf,
    exposurePct: exposure / P.capital, rawExposurePct: rawTotal / P.capital,
    dirPct: { long: expDir.long / P.capital, short: expDir.short / P.capital },
    dirRawPct: { long: rawDir['1'] / P.capital, short: rawDir['-1'] / P.capital },
    factorPct: Object.keys(expFac).map(function (k) { return { id: k, name: facName[k] || k, pct: expFac[k] / P.capital }; }).sort(function (a, b) { return b.pct - a.pct; }),
    caps: caps, costs: costs,
    scale: Math.min.apply(null, [fTotal].concat(Object.keys(fDir).map(function (d) { return fDir[d]; })).concat(Object.keys(fSym).map(function (s) { return fSym[s]; })).concat(Object.keys(fFac).map(function (k) { return fFac[k]; }))),
    positions: rows, openCount: openCount, winCount: winCount,
    waitingCount: P.positions.length - openCount, asOf: P.asOf
  };
};

// 归因与集中度：唯一实现。页面面板与 .cowork-temp/attribution.js 都只调这里，
// 避免「页面一套、脚本一套」给出两个不同的 HHI。
window.__PAPER__.attribution = function () {
  var P = window.__PAPER__;
  var F = window.__FIDX__ || { sectors: [] };
  var C = P.calc();
  var open = C.positions.filter(function (r) { return r.state === 'open' && r.notional; });
  function sectorOf(sym) {
    for (var i = 0; i < (F.sectors || []).length; i++) {
      if (F.sectors[i].members.indexOf(sym) >= 0) return F.sectors[i];
    }
    return null;
  }
  var gross = 0, bySym = {}, bySec = {}, longN = 0;
  open.forEach(function (r) {
    var n = Math.abs(r.notional);
    gross += n;
    if (r.dir > 0) longN += n;
    bySym[r.symbol] = (bySym[r.symbol] || 0) + n;
    var s = sectorOf(r.symbol), id = s ? s.id : 'other';
    bySec[id] = bySec[id] || { id: id, name: s ? s.name : '未归类', n: 0, pnl: 0, names: [] };
    bySec[id].n += n; bySec[id].pnl += r.pnl;
    if (bySec[id].names.indexOf(r.name) < 0) bySec[id].names.push(r.name);
  });
  var eq = C.equity;
  if (!open.length || !gross) {
    return { asOf: C.asOf, empty: true, equity: eq, gross: 0, exposurePct: 0, effN: 0, top1PctGross: 0, top1PctEquity: 0, sectors: [], longPct: 0, shortPct: 0, factors: [], stress: [], allDown10: 0, allDown10Pct: 0, issues: [] };
  }
  var shares = Object.keys(bySym).map(function (k) { return bySym[k] / gross; });
  var hhi = shares.reduce(function (a, b) { return a + b * b; }, 0);
  var effN = hhi ? 1 / hhi : 0;
  var top1 = Math.max.apply(null, shares);
  var secs = Object.keys(bySec).map(function (k) { return bySec[k]; }).sort(function (a, b) { return b.n - a.n; });
  var stress = secs.map(function (s) {
    var d = 0;
    open.forEach(function (r) {
      var ss = sectorOf(r.symbol);
      if ((ss ? ss.id : 'other') === s.id) d -= r.dir * Math.abs(r.notional) * 0.20;
    });
    return { name: s.name, delta: Math.round(d) };
  }).sort(function (a, b) { return a.delta - b.delta; });
  var allDown10 = open.reduce(function (acc, r) { return acc - r.dir * Math.abs(r.notional) * 0.10; }, 0);
  var facs = C.factorPct || [];
  // 未归类的敞口（指数/宏观产品不在赛道成员表里）：必须显式暴露，否则赛道归因看起来齐全其实缺一半
  var unclassified = (bySec['other'] ? bySec['other'].n : 0) / gross;
  var topClassified = secs.filter(function (s) { return s.id !== 'other'; })[0];
  var issues = [];
  if (top1 * gross / eq > 0.25) issues.push('单标的占权益 ' + Math.round(top1 * gross / eq * 100) + '%（>25%）');
  if (hhi > 0.30) issues.push('HHI ' + hhi.toFixed(2) + '（>0.30）');
  if (topClassified && topClassified.n / eq > 0.45) issues.push('单赛道占权益 ' + Math.round(topClassified.n / eq * 100) + '%（>45%）');
  if (Math.max(longN, gross - longN) / eq > 0.60) issues.push('单方向占权益 ' + Math.round(Math.max(longN, gross - longN) / eq * 100) + '%（>60% 上限）');
  if (stress[0] && Math.abs(stress[0].delta) / eq > 0.06) issues.push('最坏单赛道 -20% 亏 ' + Math.round(Math.abs(stress[0].delta) / eq * 100) + '% 权益（>6%）');
  if (facs[0] && facs[0].pct > 0.40) issues.push('单因子「' + facs[0].name + '」占权益 ' + Math.round(facs[0].pct * 100) + '%（>40%）');
  if (unclassified > 0.30) issues.push('未归类占敞口 ' + Math.round(unclassified * 100) + '%（赛道归因不完整，需补成员映射）');
  return {
    asOf: C.asOf, empty: false, equity: eq, gross: gross,
    exposurePct: gross / eq, effN: effN,
    top1PctGross: top1, top1PctEquity: top1 * gross / eq,
    hhi: hhi,
    sectors: secs.map(function (s) { return { id: s.id, name: s.id === 'other' ? '未归类（指数/宏观）' : s.name, pct: s.n / gross, pnl: s.pnl, names: s.names }; }),
    unclassifiedPct: unclassified,
    longPct: longN / gross, shortPct: (gross - longN) / gross,
    factors: facs.map(function (f) { return { name: f.name, pct: f.pct }; }),
    stress: stress, allDown10: allDown10, allDown10Pct: allDown10 / eq,
    issues: issues
  };
};
