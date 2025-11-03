// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';

export const currencyTool = tool({
  description: 'Get current exchange rate between two currencies. Use 3-letter currency codes like USD, EUR, BRL, GBP, JPY.',
  parameters: z.object({
    from: z.string().describe('Source currency code (e.g., USD)'),
    to: z.string().describe('Target currency code (e.g., BRL)'),
    amount: z.number().optional().describe('Amount to convert (default: 1)'),
  }),
  execute: async ({ from, to, amount = 1 }) => {
    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      const data = await response.json();
      const rate = data.rates[to.toUpperCase()];
      
      if (!rate) {
        throw new Error(`Currency ${to} not found`);
      }

      const convertedAmount = amount * rate;
      
      return {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
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
