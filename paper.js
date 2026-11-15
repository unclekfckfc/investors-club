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
  var sumPnl = 0, sumGross = 0, sumCost = 0, exposure = 0, winCount = 0, expDir = { long: 0, short: 0 }, expFac = {};
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
    r.pnl = r.pnlGross - r.cost;
    sumGross += r.pnlGross; sumCost += r.cost; sumPnl += r.pnl; exposure += r.notional;
    expFac[r.factor] = (expFac[r.factor] || 0) + r.notional;
    if (r.dir > 0) expDir.long += r.notional; else expDir.short += r.notional;
    if (r.pnl > 0.5) winCount++;
  });
  var equity = P.capital + sumPnl;
  return {
    capital: P.capital, equity: equity, pnl: sumPnl, pnlGross: sumGross, cost: sumCost, retPct: sumPnl / P.capital,
    grossRetPct: sumGross / P.capital, costPct: sumCost / P.capital,
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
