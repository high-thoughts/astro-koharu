---
title: 量化交易学习路径：美股 → A股 分阶段路线图
link: quant-trading-learning-path
catalog: true
sticky: true
date: 2026-05-17 18:00:00
description: 先低门槛美股练手，再深耕 A 股。12 个月从零到多市场量化实盘，含多因子体系完整教程与 vnpy 实战
tags:
  - 量化交易
  - 美股
  - A股
  - vnpy
  - Backtrader
  - 多因子
categories:
  - 笔记
  - 前端
---

## 路线总览

```plain
美股阶段 (月1-4)              过渡阶段 (月5-6)          A股阶段 (月7-12)
┌─────────────────────┐     ┌──────────────┐     ┌──────────────────┐
│ 环境搭建              │     │ 双市场并行     │     │ vnpy CTA 策略     │
│ SPY均线回测           │ ──→ │ 策略对比验证    │ ──→ │ QMT/PTrade 接入   │
│ 多因子体系 (价值/动量)  │     │ A股开户准备     │     │ 可转债/期货策略     │
│ Alpaca模拟 + 小实盘    │     │ 数据源切换      │     │ 多市场组合管理     │
└─────────────────────┘     └──────────────┘     └──────────────────┘
   门槛: $0 模拟               双轨并行              资金: ¥1万-3万
   实盘: $500-2000                                   实盘启动
```

### 为什么先美股再 A 股？

| 维度 | 美股（练手） | A 股（深耕） |
|------|-------------|-------------|
| API 门槛 | Alpaca 零门槛注册即用 | QMT/PTrade 需 ¥10 万+ |
| 数据获取 | yfinance 免费无限制 | Tushare 免费有限需积分 |
| 交易制度 | T+0，即时纠错 | T+1，犯错锁一天 |
| 佣金成本 | 零佣金 | 万 0.85-万 2.5 + 印花税 |
| 最小单位 | 1 股（$50 买 SPY） | 100 股（¥400 买 ETF） |
| 模拟交易 | Alpaca Paper 免费实时 | 券商模拟门槛高 |

**核心逻辑**：在美股把策略开发→回测→模拟→实盘全流程跑通，这些技能 80% 可直接迁移到 A 股。美股犯错成本低，熟练掌握后再用 vnpy 深耕 A 股。

---

## 第一阶段：美股量化基础（月 1-4.5）

> 预算：$0（模拟期）→ $500-2,000（实盘验证期）

### 第 1-2 周：环境搭建与数据获取

```bash
cd /home/highthoughts/Project/vnpy
uv pip install yfinance alpaca-py backtrader matplotlib mplfinance pandas-datareader
```

| 天数 | 任务 | 产出 |
|------|------|------|
| Day 1-2 | 用 yfinance 下载 SPY/QQQ 5 年历史数据 | 一个 DataFrame |
| Day 3-4 | 用 mplfinance 画 K 线图 + 均线 | 第一张量化图表 |
| Day 5-6 | 计算常用技术指标：SMA, EMA, MACD, RSI, ATR | 指标 DataFrame |
| Day 7 | 注册 Alpaca 模拟账户 | API Key |

```python
import yfinance as yf
import mplfinance as mpf

spy = yf.download('SPY', start='2023-01-01', end='2026-05-17')

# 计算均线
spy['SMA20'] = spy['Close'].rolling(20).mean()
spy['SMA50'] = spy['Close'].rolling(50).mean()

# 画图
mpf.plot(spy[-120:], type='candle', volume=True,
         mav=(20, 50), style='charles',
         title='SPY Daily with 20/50 SMA')
```

### 第 3-4 周：第一个策略 — 双均线交叉

```python
import backtrader as bt
import yfinance as yf

class SmaCross(bt.Strategy):
    params = (('fast', 20), ('slow', 50))

    def __init__(self):
        fast_ma = bt.ind.SMA(period=self.params.fast)
        slow_ma = bt.ind.SMA(period=self.params.slow)
        self.crossover = bt.ind.CrossOver(fast_ma, slow_ma)

    def next(self):
        if self.crossover > 0:   # 金叉 — 买入
            if not self.position:
                self.buy()
        elif self.crossover < 0: # 死叉 — 卖出
            if self.position:
                self.close()

cerebro = bt.Cerebro()
cerebro.addstrategy(SmaCross)

spy = yf.download('SPY', start='2020-01-01', end='2026-05-17')
data = bt.feeds.PandasData(dataname=spy)
cerebro.adddata(data)

cerebro.broker.setcash(10000.0)
cerebro.broker.setcommission(commission=0.001)

print(f'起始资金: {cerebro.broker.getvalue():.2f}')
cerebro.run()
print(f'期末资金: {cerebro.broker.getvalue():.2f}')
cerebro.plot(style='candlestick')
```

### 回测指标速查

| 指标 | 含义 | 判断标准 |
|------|------|----------|
| 年化收益率 | (1+总收益)^(1/年数)-1 | >15% 可接受 |
| 夏普比率 | (收益-无风险利率)/波动率 | >1.0 可行，>2.0 优秀 |
| 最大回撤 | 峰值到谷底最大跌幅 | <20% 可接受 |
| 胜率 | 盈利交易数/总交易数 | 30-60% 都正常 |
| 盈亏比 | 平均盈利/平均亏损 | >1.5 算好策略 |
| Calmar 比率 | 年化收益/最大回撤 | >0.5 可接受 |

### 第 5-6 周：策略优化与过拟合检测

```plain
数据划分：
├── 训练集 (2020-2022, 60%)  → 优化参数用
├── 验证集 (2023-2024, 20%)  → 选择最佳参数
└── 测试集 (2025+, 20%)      → 最终评估，只跑一次！
```

**常见过拟合信号**：
- 训练集夏普 >> 测试集夏普（如 3.5 → 0.5）
- 参数微小变化导致结果剧烈波动
- 策略只在一个特定品种上有效
- 交易次数太少（<20 笔）或太多（>500 笔/年）

---

## 第 7-10 周：多因子体系（核心）

多因子模型是现代金融学的核心框架，是区分"业余均线玩家"和"专业量化交易者"的分水岭。

```plain
技术分析策略：price(t) → signal(t)              （单变量、时序）
多因子策略：   N个因子(t) → score(t) → weights(t) （多变量、横截面）
```

### 核心因子一览

| 因子类别 | 因子名称 | 计算方式 | 经济直觉 | 典型溢价 |
|----------|----------|----------|----------|----------|
| 价值 | B/P | 净资产/市值 | 便宜公司长期跑赢贵的 | 3-5%/年 |
| 动量 | 12-1 Month Return | 过去 12 月（剔除最近 1 月）收益 | 强者恒强（中期） | 6-10%/年 |
| 质量 | ROE, 利润率 | 财务指标综合打分 | 好公司长期创造价值 | 2-4%/年 |
| 规模 | Market Cap | 总市值取对数 | 小公司长期跑赢大公司 | 2-3%/年 |
| 低波动 | 60 日收益率标准差 | 过去 60 个交易日波动率 | 低波动风险调整收益更高 | 1-3%/年 |
| 反转 | 近 1 月收益 | 过去 20 个交易日收益 | 短期过度反应后均值回归 | 3-5%/年 |

### 因子处理流水线

因子不能直接合并，必须经过三步处理：

1. **去极值 (Winsorize)**：将 1% 和 99% 分位数之外的值压缩到边界，避免极端值主导排名
2. **标准化 (Z-Score)**：让不同量纲的因子可比
3. **市值/行业中性化**：用因子值对市值做回归，取残差 = 剔除市值影响后的纯因子暴露

```python
def preprocess_factors(factors_df, factor_names):
    processed = factors_df.copy()
    for f in factor_names:
        # 截面去极值
        def winsorize_series(s):
            lower, upper = s.quantile(0.01), s.quantile(0.99)
            return s.clip(lower, upper)
        processed[f] = processed.groupby('date')[f].transform(winsorize_series)

        # 截面 Z-Score
        processed[f + '_z'] = processed.groupby('date')[f].transform(
            lambda x: (x - x.mean()) / x.std()
        )
    return processed
```

### 用 Alphalens 做单因子检验

```bash
uv pip install alphalens-reloaded
```

Alphalens 是 Quantopian 开源的因子分析库，核心输出：

| 检查项 | 标准 | 不通过意味着 |
|--------|------|-------------|
| \|IC\| 均值 | > 0.03 | 因子与收益方向性关系太弱 |
| IC_IR | > 0.5 | 因子显著性不足 |
| Q5-Q1 收益差 | > 0 且单调 | 无区分度 |
| 因子自相关 | 0.85-0.98 | 换手过高或因子停滞 |
| 牛熊市表现 | 稳定为佳 | 只在牛市有效的因子是假因子 |

### 因子合成与组合构建

按综合得分选 Top 25 只等权持有，月度调仓。可用等权 / IC 加权 / IC_IR 加权三种方式合成综合得分。

---

## 第 11-18 周：模拟交易 + 小资金实盘

### Alpaca 模拟交易 4 周任务

| 周次 | 任务 | 关注点 |
|------|------|--------|
| Week 1 | 手动下单 1 股 SPY | 订单类型、成交时间 |
| Week 2 | 脚本自动执行双均线策略 | 每日收盘前检查信号 |
| Week 3 | 同时跑 2 个策略 | 资金分配、策略冲突 |
| Week 4 | 加入日志、通知、异常处理 | 断线重连、重复下单防护 |

### 实盘资金管理规则

```plain
账户总资金: $2,000
每笔风险上限: 账户的 1% = $20
最大同时持仓: 2 个品种
单品种仓位上限: 账户的 50%
止损: 每笔 -5% 硬止损
连续亏损 3 笔 → 暂停一周
当月亏损超 5% → 当月停止交易
```

---

## 第二阶段：双市场并行（月 5-6）

### 同一策略，两个市场对比

| 分析维度 | SPY (美股) | 510300 (A 股) |
|----------|-----------|--------------|
| 交易频率 | T+0 | T+1 |
| 手续费 | 零佣金 | 万 1+印花税 |
| 流动性 | 日均 $300 亿+ | 日均 ¥20 亿 |

```bash
# 安装 A 股数据工具
uv pip install tushare akshare efinance

# 注册 Tushare Pro（免费）
# https://tushare.pro → 注册 → 获取 token
```

### A 股券商开户

| 券商/平台 | 用途 | 资金门槛 |
|-----------|------|----------|
| QMT（迅投） | A 股实盘执行 | ¥10 万+ |
| PTrade（恒生） | A 股实盘执行 | ¥10 万+ |
| CTP（期货） | 期货实盘 | ¥3,000-30,000 |
| 聚宽 JoinQuant | 研究+回测 | ¥0 |
| 米筐 RiceQuant | 研究+回测 | ¥0 |

---

## 第三阶段：A 股量化深耕（月 7-10）

### vnpy CTA 策略模板

```python
from vnpy_ctastrategy import (
    CtaTemplate, StopOrder, TickData, BarData,
    TradeData, OrderData, BarGenerator, ArrayManager,
)

class DoubleMaStrategy(CtaTemplate):
    """双均线策略 — vnpy 版"""
    author = "your_name"
    fast_window = 10
    slow_window = 20

    parameters = ["fast_window", "slow_window"]
    variables = ["fast_ma", "slow_ma"]

    def __init__(self, cta_engine, strategy_name, vt_symbol, setting):
        super().__init__(cta_engine, strategy_name, vt_symbol, setting)
        self.bg = BarGenerator(self.on_bar)
        self.am = ArrayManager()

    def on_bar(self, bar: BarData):
        self.cancel_all()
        am = self.am
        am.update_bar(bar)
        if not am.inited:
            return

        self.fast_ma = am.sma(self.fast_window, array=True)[-1]
        self.slow_ma = am.sma(self.slow_window, array=True)[-1]

        cross_over = (self.fast_ma > self.slow_ma and
                      am.sma(self.fast_window, array=True)[-2] <=
                      am.sma(self.slow_window, array=True)[-2])
        cross_below = (self.fast_ma < self.slow_ma and
                       am.sma(self.fast_window, array=True)[-2] >=
                       am.sma(self.slow_window, array=True)[-2])

        if cross_over and self.pos == 0:
            self.buy(bar.close_price, 1)
        elif cross_below and self.pos > 0:
            self.sell(bar.close_price, 1)

        self.put_event()
```

### A 股特有策略

**小市值轮动**：每月买入市值最小的 N 只股票，月换仓。A 股独有因子溢价，回测年化 30-80%。防护：成交额过滤（>3000 万）、ST 过滤、单票仓位上限 5%、整体止损 -10%。

**可转债网格**：T+0、无印花税、有债底保护。价格 110-130 建仓，每涨 2 元卖、每跌 2 元买。避开高价债（>150）、高溢价（>50%）、临期债。

**期货 CTP 日内**：螺纹钢/甲醇/PTA，保证金 ¥3,000-7,000/手，T+0 + 杠杆。

---

## 第四阶段：多市场组合（月 11-12+）

```plain
                    ┌──────────────────────┐
                    │    监控 + 风控中心      │
                    └──────┬───────────────┘
         ┌─────────────────┼─────────────────┐
    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
    │ 美股子账户 │      │ A股子账户 │      │ 期货子账户 │
    │ SPY趋势  │      │ ETF轮动  │      │ 螺纹日内  │
    │ QQQ动量  │      │ 可转债网格 │      │ 甲醇趋势  │
    │ TLT避险  │      │ 小市值轮动 │      │ PTA套利  │
    └─────────┘      └─────────┘      └─────────┘

总策略数: 6-8 个，任意两个策略相关系数 < 0.5
```

---

## 12 个月心态曲线

```plain
月1-2:  兴奋期 — "量化太简单了，回测年化 50%！"
月3-4:  幻灭期 — "实盘怎么跟回测差这么多……"
月5-6:  学习期 — "原来是过拟合、手续费、滑点在作怪"
月7-8:  重建期 — "重新设计策略，这次认真做 Walk-Forward"
月9-10: 稳定期 — "实盘开始在预期范围内运行"
月11-12: 信心期 — "有了自己的体系"
```

---

## 铁律十条

1. **第一年目标是不亏**，不是赚多少
2. **每笔风险不超过账户 1-2%** — 这是数学，不是建议
3. **机器执行，人走开** — 人工干预是量化最大的敌人
4. **不信回测** — Walk-Forward 好才有意义
5. **实盘从小开始** — 先 1 手，验证 20 笔交易后才加仓
6. **亏损是学费** — 接受它、记录它、学习它
7. **不追回亏损** — 连续亏损后加倍下注 = 快速爆仓
8. **每周复盘** — 写出每笔交易的理由和结果
9. **保持学习** — 市场在变，策略也要进化
10. **不要全职** — 有稳定收入业余做，压力小决策好

---

## 关键资源

| 阶段 | 资源 | 链接 |
|------|------|------|
| 美股 | Backtrader 文档 | https://www.backtrader.com/docu/ |
| 美股 | Alpaca Python SDK | https://github.com/alpacahq/alpaca-py |
| 美股 | Alphalens-Reloaded | https://github.com/stefan-jansen/alphalens-reloaded |
| 过渡 | vnpy 官方文档 | https://www.vnpy.com/docs |
| A 股 | 聚宽 | https://www.joinquant.com |
| A 股 | 米筐 | https://www.ricequant.com |
| A 股 | Tushare Pro | https://tushare.pro |
| 进阶 | r/algotrading | Reddit 国际量化社区 |

---

> **一句话总结**：用美股低门槛环境学会量化全流程，再用这些技能回 A 股深耕。12 个月后，你拥有的不是一个策略，而是一套完整的量化交易体系。
