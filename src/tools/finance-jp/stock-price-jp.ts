import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getQuote, getHistoricalPrices, normalizeTicker } from './api.js';
import { formatToolResult } from '../types.js';

export const JP_STOCK_PRICE_DESCRIPTION = `
Fetches current stock price for Japanese equities (TSE). Accepts 4-digit ticker codes (e.g., 7203 for Toyota, 6758 for Sony). Also works with US tickers. Powered by Yahoo Finance.

## When to Use
- Japanese stock prices (4-digit codes like 7203, 9984, 6758)
- Any stock not covered by Financial Datasets API
- Comparing Japanese and US stock prices

## When NOT to Use
- For US stocks where Financial Datasets API has better data (use financial_search instead)
`.trim();

const JpStockPriceSchema = z.object({
  ticker: z
    .string()
    .describe(
      "Stock ticker. For Japanese stocks, use the 4-digit code (e.g., '7203' for Toyota, '9984' for SoftBank). US tickers also work (e.g., 'AAPL')."
    ),
});

export const getJpStockPrice = new DynamicStructuredTool({
  name: 'get_jp_stock_price',
  description:
    'Fetches current stock price snapshot for Japanese (TSE) and international equities via Yahoo Finance. Includes price, change, market cap, 52-week range.',
  schema: JpStockPriceSchema,
  func: async (input) => {
    try {
      const quote = await getQuote(input.ticker);
      return formatToolResult(quote, [
        `https://finance.yahoo.co.jp/quote/${normalizeTicker(input.ticker)}`,
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return formatToolResult({ error: msg, ticker: input.ticker }, []);
    }
  },
});

const JpStockPricesSchema = z.object({
  ticker: z
    .string()
    .describe("Stock ticker (4-digit for Japanese, letters for US)."),
  start_date: z.string().describe('Start date in YYYY-MM-DD format.'),
  end_date: z.string().describe('End date in YYYY-MM-DD format.'),
  interval: z
    .enum(['1d', '1wk', '1mo'])
    .default('1d')
    .describe("Price interval. '1d' for daily, '1wk' for weekly, '1mo' for monthly."),
});

export const getJpStockPrices = new DynamicStructuredTool({
  name: 'get_jp_stock_prices',
  description:
    'Retrieves historical price data for Japanese (TSE) and international stocks over a date range via Yahoo Finance.',
  schema: JpStockPricesSchema,
  func: async (input) => {
    try {
      const prices = await getHistoricalPrices(
        input.ticker,
        input.start_date,
        input.end_date,
        input.interval
      );
      return formatToolResult(prices, [
        `https://finance.yahoo.co.jp/quote/${normalizeTicker(input.ticker)}/history`,
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return formatToolResult({ error: msg, ticker: input.ticker }, []);
    }
  },
});
