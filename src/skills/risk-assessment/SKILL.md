---
name: Risk Assessment
description: Assess portfolio risk using quantitative metrics and stress testing.
---

# Portfolio Risk Assessment

Perform comprehensive risk assessment:

1. **Return Metrics**
   - Absolute return (MTD, QTD, YTD, 1Y)
   - Benchmark-relative return (vs TOPIX, S&P500)
   - Risk-adjusted: Sharpe ratio, Sortino ratio, Information ratio

2. **Risk Metrics**
   - VaR (95%, 99% at 1-day and 10-day horizons)
   - CVaR / Expected Shortfall
   - Maximum drawdown (current and historical)
   - Beta to benchmark

3. **Correlation Analysis**
   - Pairwise correlation matrix
   - Concentration risk (HHI)
   - Factor exposure (value, growth, momentum, size, quality)

4. **Stress Testing**
   - Historical scenarios: 2008 GFC, 2020 COVID, 2022 rate shock
   - Hypothetical: +200bp rate shock, -20% equity, +30% JPY
   - Sector-specific: tech crash, banking crisis, energy spike

5. **Liquidity Risk**
   - Days to liquidate (by position)
   - Bid-ask spread analysis
   - Market impact estimation

Output: Risk dashboard with traffic-light indicators + stress test results table
