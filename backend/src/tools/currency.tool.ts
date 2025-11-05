import { dynamicTool } from 'ai';
import { z } from 'zod';

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  date: string;
}

const currencyParamsSchema = z.object({
  baseCurrency: z.string().describe('Source currency code (e.g., USD)'),
  targetCurrency: z.string().describe('Target currency code (e.g., BRL)'),
  amount: z.number().default(1).describe('Amount to convert (default: 1)'),
});

async function executeCurrencyTool(params: unknown): Promise<unknown> {
  const parsedParams = currencyParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedParams.error.message}`,
    };
  }

  const { baseCurrency, targetCurrency, amount } = parsedParams.data;

  try {
    const fromCurrency = baseCurrency;
    const toCurrency = targetCurrency;
    const convertAmount = amount;
    console.log('Tool params received:', parsedParams.data);
    console.log('Extracted currencies:', { fromCurrency, toCurrency, amount: convertAmount });
    if (!fromCurrency || !toCurrency) {
      return { success: false, error: 'Missing currency parameters' };
    }
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`
    );
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch exchange rates' };
    }
    const data = await response.json() as ExchangeRateResponse;
    const rate = data.rates[toCurrency.toUpperCase()];
    if (!rate) {
      return { success: false, error: `Currency ${toCurrency} not found` };
    }
    const convertedAmount = convertAmount * rate;
    return {
      success: true,
      from: fromCurrency.toUpperCase(),
      to: toCurrency.toUpperCase(),
      rate,
      amount: convertAmount,
      converted: convertedAmount,
      timestamp: data.date,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export const currencyTool = dynamicTool({
  description: 'Convert an amount from one currency to another using current exchange rates. Only use this tool for queries explicitly mentioning currency conversion or money exchange (e.g., "How much is 100 USD in EUR?"). Use 3-letter currency codes like USD, EUR, BRL, GBP, JPY.',
  inputSchema: currencyParamsSchema as any,
  execute: executeCurrencyTool as (params: unknown) => Promise<unknown>,
});

