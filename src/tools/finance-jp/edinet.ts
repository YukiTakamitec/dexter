import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../types.js';
import { normalizeTicker } from './api.js';

/**
 * EDINET API v2 - Japanese Securities Filings
 *
 * Base URL: https://api.edinet-fsa.go.jp/api/v2/
 * Endpoints:
 *   - /documents.json?date=YYYY-MM-DD&type=2  (document list)
 *   - /documents/{docID}?type=1               (download document)
 *
 * Requires: EDINET_API_KEY (subscription key from EDINET)
 * Register at: https://disclosure.edinet-fsa.go.jp/
 */

const EDINET_BASE_URL = 'https://api.edinet-fsa.go.jp/api/v2';

interface EdinetDocument {
  docID: string;
  edinetCode: string;
  filerName: string;
  docTypeCode: string;
  docDescription: string;
  submitDateTime: string;
  periodStart?: string;
  periodEnd?: string;
}

async function searchEdinet(
  date: string,
  edinetCode?: string
): Promise<EdinetDocument[]> {
  const apiKey = process.env.EDINET_API_KEY;
  if (!apiKey) {
    throw new Error(
      'EDINET_API_KEY is not set. Register at https://disclosure.edinet-fsa.go.jp/ to get a subscription key.'
    );
  }

  const url = new URL(`${EDINET_BASE_URL}/documents.json`);
  url.searchParams.set('date', date);
  url.searchParams.set('type', '2'); // metadata only
  url.searchParams.set('Subscription-Key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`EDINET API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    results: EdinetDocument[];
  };

  let docs = data.results || [];

  // Filter by EDINET code if specified
  if (edinetCode) {
    docs = docs.filter((d) => d.edinetCode === edinetCode);
  }

  return docs;
}

export const EDINET_DESCRIPTION = `
Searches Japanese securities filings (有価証券報告書, 四半期報告書, etc.) from EDINET (Electronic Disclosure for Investors' NETwork), Japan's equivalent of SEC EDGAR.

## When to Use
- Japanese company annual reports (有価証券報告書 / 有報)
- Quarterly reports (四半期報告書)
- Earnings reports (決算短信)
- Large shareholding reports (大量保有報告書)
- Insider trading reports

## Requirements
- EDINET_API_KEY environment variable must be set
- Register at https://disclosure.edinet-fsa.go.jp/ for a free subscription key

## Limitations
- Returns filing metadata only (title, date, filer)
- Full document download requires separate request
`.trim();

const EdinetSearchSchema = z.object({
  date: z
    .string()
    .describe('Filing date to search in YYYY-MM-DD format.'),
  company_name: z
    .string()
    .optional()
    .describe('Optional company name filter (Japanese or English).'),
});

export const searchEdinetFilings = new DynamicStructuredTool({
  name: 'search_edinet_filings',
  description:
    'Searches Japanese securities filings from EDINET. Returns filing metadata (title, company, type, date). Requires EDINET_API_KEY.',
  schema: EdinetSearchSchema,
  func: async (input) => {
    try {
      const docs = await searchEdinet(input.date);

      // Filter by company name if provided
      let filtered = docs;
      if (input.company_name) {
        const query = input.company_name.toLowerCase();
        filtered = docs.filter(
          (d) =>
            d.filerName.toLowerCase().includes(query) ||
            d.docDescription?.toLowerCase().includes(query)
        );
      }

      // Return top 20 results
      const results = filtered.slice(0, 20).map((d) => ({
        docID: d.docID,
        filerName: d.filerName,
        docType: d.docTypeCode,
        description: d.docDescription,
        submitDate: d.submitDateTime,
        period: d.periodEnd ? `${d.periodStart || ''} ~ ${d.periodEnd}` : undefined,
      }));

      return formatToolResult(results, ['https://disclosure.edinet-fsa.go.jp/']);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return formatToolResult({ error: msg }, []);
    }
  },
});
