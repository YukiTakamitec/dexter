import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getFundamentals, getIncomeHistory, normalizeTicker } from './api.js';
import { formatToolResult } from '../types.js';

export const JP_FUNDAMENTALS_DESCRIPTION = `
Fetches fundamental financial data for Japanese equities (TSE) via Yahoo Finance. Includes valuation metrics (PER, PBR, EV/EBITDA), profitability (ROE, ROA, margins), financial statements, and dividend data.

## When to Use
- Japanese stock fundamentals (4-digit codes like 7203, 9984)
- Quick valuation snapshot for any Yahoo Finance-supported stock
- Comparing fundamentals across Japanese and US stocks

## Data Returned
- Company info: name, sector, industry
- Valuation: PER, PBR, EV/EBITDA, market cap, enterprise value
- Profitability: ROE, ROA, profit margin
- Growth: revenue growth, earnings growth
- Dividend: yield, payout ratio
- Financials: revenue, EBITDA, FCF, debt, cash
`.trim();

const JpFundamentalsSchema = z.object({
  ticker: z
    .string()
    .describe(
      "Stock ticker. Japanese: 4-digit code (e.g., '7203'). US: letters (e.g., 'AAPL')."
    ),
});

export const getJpFundamentals = new DynamicStructuredTool({
  name: 'get_jp_fundamentals',
  description:
    'Fetches fundamental financial data (valuation, profitability, growth, dividend) for Japanese and international stocks via Yahoo Finance.',
  schema: JpFundamentalsSchema,
  func: async (input) => {
    try {
      const data = await getFundamentals(input.ticker);
      return formatToolResult(data, [
        `https://finance.yahoo.co.jp/quote/${normalizeTicker(input.ticker)}`,
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return formatToolResult({ error: msg, ticker: input.ticker }, []);
    }
  },
});

const JpIncomeHistorySchema = z.object({
  ticker: z
    .string()
    .describe("Stock ticker. Japanese: 4-digit code. US: letters."),
  annual: z
    .boolean()
    .default(true)
    .describe("true for annual statements, false for quarterly."),
});

export const getJpIncomeHistory = new DynamicStructuredTool({
  name: 'get_jp_income_history',
  description:
    'Retrieves historical income statement data (revenue, gross profit, operating income, net income) for Japanese and international stocks via Yahoo Finance.',
  schema: JpIncomeHistorySchema,
  func: async (input) => {
    try {
      const statements = await getIncomeHistory(input.ticker, input.annual);
      return formatToolResult(statements, [
        `https://finance.yahoo.co.jp/quote/${normalizeTicker(input.ticker)}/performance`,
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return formatToolResult({ error: msg, ticker: input.ticker }, []);
    }
  },
});
