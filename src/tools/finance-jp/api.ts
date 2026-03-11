import YahooFinanceModule from 'yahoo-finance2';

// yahoo-finance2 v3 requires instantiation
const yahooFinance = new (YahooFinanceModule as unknown as new () => typeof YahooFinanceModule)();

/**
 * Yahoo Finance wrapper for Japanese and international stocks.
 * Japanese tickers use the .T suffix (e.g., 7203.T for Toyota).
 * US tickers are used as-is (e.g., AAPL).
 */

/**
 * Normalize ticker for Yahoo Finance.
 * - 4-digit numbers -> append .T (Tokyo Stock Exchange)
 * - Already has suffix (.T, .N, etc.) -> keep as-is
 * - Letters only -> keep as-is (US ticker)
 */
export function normalizeTicker(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  if (t.includes('.')) return t;
  if (/^\d{4,5}$/.test(t)) return `${t}.T`;
  return t;
}

export function isJapaneseTicker(ticker: string): boolean {
  const normalized = normalizeTicker(ticker);
  return normalized.endsWith('.T') || normalized.endsWith('.N') || normalized.endsWith('.F');
}

export interface QuoteResult {
  ticker: string;
  name: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
  exchange: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export async function getQuote(ticker: string): Promise<QuoteResult> {
  const symbol = normalizeTicker(ticker);
  const quote = await yahooFinance.quote(symbol) as Record<string, unknown>;

  return {
    ticker: symbol,
    name: (quote.shortName || quote.longName || symbol) as string,
    price: (quote.regularMarketPrice ?? 0) as number,
    currency: (quote.currency || 'JPY') as string,
    change: (quote.regularMarketChange ?? 0) as number,
    changePercent: (quote.regularMarketChangePercent ?? 0) as number,
    marketCap: quote.marketCap as number | undefined,
    volume: quote.regularMarketVolume as number | undefined,
    exchange: (quote.fullExchangeName || quote.exchange || '') as string,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh as number | undefined,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow as number | undefined,
  };
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getHistoricalPrices(
  ticker: string,
  period1: string,
  period2: string,
  interval: '1d' | '1wk' | '1mo' = '1d'
): Promise<HistoricalPrice[]> {
  const symbol = normalizeTicker(ticker);
  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval,
  });

  const quotes = (result as Record<string, unknown>).quotes as Array<Record<string, unknown>> | undefined;
  if (!quotes) return [];

  return quotes.map((q) => ({
    date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date || ''),
    open: (q.open ?? 0) as number,
    high: (q.high ?? 0) as number,
    low: (q.low ?? 0) as number,
    close: (q.close ?? 0) as number,
    volume: (q.volume ?? 0) as number,
  }));
}

export interface FundamentalData {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  currency: string;
  totalRevenue?: number;
  ebitda?: number;
  totalDebt?: number;
  totalCash?: number;
  operatingCashFlow?: number;
  freeCashFlow?: number;
  marketCap?: number;
  enterpriseValue?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  evToEbitda?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  dividendYield?: number;
  dividendRate?: number;
  payoutRatio?: number;
  sharesOutstanding?: number;
  floatShares?: number;
}

export async function getFundamentals(ticker: string): Promise<FundamentalData> {
  const symbol = normalizeTicker(ticker);

  const [summary, quoteData] = await Promise.all([
    yahooFinance.quoteSummary(symbol, {
      modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics'],
    }) as Promise<Record<string, Record<string, unknown>>>,
    yahooFinance.quote(symbol) as Promise<Record<string, unknown>>,
  ]);

  const fin = summary.financialData || {};
  const ks = summary.defaultKeyStatistics || {};
  const profile = summary.summaryProfile || {};

  return {
    ticker: symbol,
    name: (quoteData.shortName || quoteData.longName || symbol) as string,
    sector: (profile.sector || '') as string,
    industry: (profile.industry || '') as string,
    currency: (quoteData.currency || 'JPY') as string,
    totalRevenue: fin.totalRevenue as number | undefined,
    ebitda: fin.ebitda as number | undefined,
    totalDebt: fin.totalDebt as number | undefined,
    totalCash: fin.totalCash as number | undefined,
    operatingCashFlow: fin.operatingCashflow as number | undefined,
    freeCashFlow: fin.freeCashflow as number | undefined,
    marketCap: quoteData.marketCap as number | undefined,
    enterpriseValue: ks.enterpriseValue as number | undefined,
    trailingPE: quoteData.trailingPE as number | undefined,
    forwardPE: quoteData.forwardPE as number | undefined,
    priceToBook: ks.priceToBook as number | undefined,
    evToEbitda: ks.enterpriseToEbitda as number | undefined,
    returnOnEquity: fin.returnOnEquity as number | undefined,
    returnOnAssets: fin.returnOnAssets as number | undefined,
    profitMargin: fin.profitMargins as number | undefined,
    revenueGrowth: fin.revenueGrowth as number | undefined,
    earningsGrowth: fin.earningsGrowth as number | undefined,
    dividendYield: quoteData.dividendYield as number | undefined,
    dividendRate: quoteData.dividendRate as number | undefined,
    payoutRatio: ks.payoutRatio as number | undefined,
    sharesOutstanding: ks.sharesOutstanding as number | undefined,
    floatShares: ks.floatShares as number | undefined,
  };
}

export interface FinancialStatement {
  endDate: string;
  totalRevenue?: number;
  costOfRevenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
}

export async function getIncomeHistory(
  ticker: string,
  annual: boolean = true
): Promise<FinancialStatement[]> {
  const symbol = normalizeTicker(ticker);
  const moduleName = annual
    ? 'incomeStatementHistory'
    : 'incomeStatementHistoryQuarterly';

  const result = await yahooFinance.quoteSummary(symbol, {
    modules: [moduleName as 'incomeStatementHistory'],
  }) as Record<string, unknown>;

  const container = result[moduleName] as
    | { incomeStatementHistory: Array<Record<string, unknown>> }
    | undefined;

  if (!container?.incomeStatementHistory) return [];

  return container.incomeStatementHistory.map((s) => ({
    endDate: s.endDate instanceof Date
      ? s.endDate.toISOString().split('T')[0]
      : String(s.endDate || ''),
    totalRevenue: s.totalRevenue as number | undefined,
    costOfRevenue: s.costOfRevenue as number | undefined,
    grossProfit: s.grossProfit as number | undefined,
    operatingIncome: s.operatingIncome as number | undefined,
    netIncome: s.netIncome as number | undefined,
  }));
}
