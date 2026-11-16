/* 未来指数：六赛道等权（权重调整权归季度复盘大会，避免开发者暗箱调权） */
window.__FIDX__ = {
  base: 1000,
  name: '未来指数',
  note: '六赛道等权，基期 2026-11-10；权重调整须经季度复盘大会议事',
  sectors: [
    { id: 'ai', name: 'AI 算力', emoji: '🧠', members: ['usNVDA', 'usAMD', 'usTSM', 'usASML', 'usVRT'] },
    { id: 'energy', name: '能源转型', emoji: '⚡', members: ['usCEG', 'usOKLO', 'usENPH', 'usFSLR'] },
    { id: 'bio', name: '生物科技', emoji: '🧬', members: ['usXBI', 'usLLY', 'usMRNA', 'usCRSP'] },
    { id: 'space', name: '太空经济', emoji: '🛰️', members: ['usRKLB', 'usLMT', 'usMP'] },
    { id: 'mat', name: '关键材料', emoji: '⛏️', members: ['hf_HG', 'hf_SI', 'usCCJ'] },
    { id: 'robot', name: '机器人与自动化', emoji: '🤖', members: ['usISRG', 'usTER', 'usROK', 'usSYM'] }
  ],
  bench: {
    name: '基准（沪深300 + 标普500 等权）',
    base: 1000,
    note: '基期 2026-11-10；11-14/15 为周末，沿用 11-13 收盘；成分收盘来自东方财富 K 线',
    components: [
      { code: '1.000300', name: '沪深300', closes: { '2026-11-10': 4059.11, '2026-11-11': 4075.71, '2026-11-12': 4043.93, '2026-11-13': 4016.29 } },
      { code: '100.SPX', name: '标普500', closes: { '2026-11-10': 7520.93, '2026-11-11': 7619.38, '2026-11-12': 7592.40, '2026-11-13': 7561.67 } }
    ],
    points: [
      { date: '2026-11-10', nav: 1000 },
      { date: '2026-11-11', nav: 1008.59 },
      { date: '2026-11-12', nav: 1002.88 },
      { date: '2026-11-13', nav: 997.43 },
      { date: '2026-11-15', nav: 997.43 },
      { date: '2026-11-16', nav: 997.43 }
    ]
  }
};
