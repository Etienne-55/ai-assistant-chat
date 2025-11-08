import { weatherTool } from '../tools/weather.tool';
import { currencyTool } from '../tools/currency.tool';
import { pdfTool } from '../tools/pdf.tool';

export class ToolService {
  getAllTools() {
    return {
      getWeather: weatherTool,
      getCurrency: currencyTool,
      readPDF: pdfTool,
    };
  }

  getTool(name: string) {
    const tools = this.getAllTools();
    return tools[name as keyof typeof tools];
  }
}
