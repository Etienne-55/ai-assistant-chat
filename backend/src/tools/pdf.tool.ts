import { dynamicTool } from 'ai';
import { z } from 'zod';
import fs from 'fs/promises';

const pdfParamsSchema = z.object({
  filePath: z.string().describe('Path to the PDF file on server'),
  query: z.string().describe('What to search for in the PDF'),
});

// type PdfParams = z.infer<typeof pdfParamsSchema>;
//
// interface PdfToolResult {
//   success: boolean;
//   content?: string;
//   pages?: number;
//   query?: string;
//   error?: string;
// }

async function executePdfTool(params: unknown): Promise<unknown> {
  const parsedParams = pdfParamsSchema.safeParse(params);
  
  if (!parsedParams.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedParams.error.message}`,
    };
  }

  const { filePath, query } = parsedParams.data;

  try {
    console.log('PDF tool params received:', parsedParams.data);

    try {
      await fs.access(filePath);
    } catch {
      return {
        success: false,
        error: `PDF file not found at path: ${filePath}`,
      };
    }

    const dataBuffer = await fs.readFile(filePath);
    
    let pdfParse;
    try {
      const pdfModule = await import('pdf-parse');
      pdfParse = pdfModule.default || pdfModule;
    } catch (e) {
      pdfParse = require('pdf-parse');
    }

    if (typeof pdfParse !== 'function' && pdfParse.default) {
      pdfParse = pdfParse.default;
    }

    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse module did not export a function');
    }

    const data = await pdfParse(dataBuffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'PDF appears to be empty or contains no extractable text',
      };
    }

    console.log(`PDF extracted: ${data.numpages} pages, ${text.length} characters`);

    return {
      success: true,
      content: text,
      pages: data.numpages,
      query: query,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      success: false,
      error: `Failed to read PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export const pdfTool = dynamicTool({
  description: 'Read and extract text from PDF files to answer questions about their content. Use when user has uploaded a PDF or asks about PDF content. The filePath parameter should be the server path where the PDF is stored.',
  inputSchema: pdfParamsSchema as any,
  execute: executePdfTool as (params: unknown) => Promise<unknown>,
});

