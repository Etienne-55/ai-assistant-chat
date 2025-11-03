// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';

export const currencyTool = tool({
  description: 'Get current exchange rate between two currencies. Use 3-letter currency codes like USD, EUR, BRL, GBP, JPY.',
  parameters: z.object({
    baseCurrency: z.string().describe('Source currency code (e.g., USD)'),
    targetCurrency: z.string().describe('Target currency code (e.g., BRL)'),
    amount: z.number().optional().describe('Amount to convert (default: 1)'),
  }),
  execute: async (params: any) => {
    try {
      const fromCurrency = params.baseCurrency || params.currencyFrom || params.fromCurrency || params.from_currency || params.from;
      const toCurrency = params.targetCurrency || params.currencyTo || params.toCurrency || params.to_currency || params.to;
      const amount = params.amount || 1;

      console.log('Tool params received:', params);
      console.log('Extracted currencies:', { fromCurrency, toCurrency, amount });

      if (!fromCurrency || !toCurrency) {
        throw new Error('Missing currency parameters');
      }

      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      const data = await response.json();
      const rate = data.rates[toCurrency.toUpperCase()];
      
      if (!rate) {
        throw new Error(`Currency ${toCurrency} not found`);
      }

      const convertedAmount = amount * rate;
      
      return {
        from: fromCurrency.toUpperCase(),
        to: toCurrency.toUpperCase(),
        rate: rate,
        amount: amount,
        converted: convertedAmount,
        timestamp: data.date,
      };
    } catch (error) {
      return {
        error: `Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

