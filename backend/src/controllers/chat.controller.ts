import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';

export class ChatController {
  constructor(private chatService: ChatService) {}

  async handleChat(req: Request, res: Response): Promise<void> {
    try {
      const { message } = req.body;
      const pdfFile = req.file;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      console.log('Request:', { message, pdf: pdfFile?.filename });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await this.chatService.processMessage({
        message,
        pdfPath: pdfFile?.path,
        onChunk: (text) => res.write(text),
        onComplete: () => res.end(),
      });

    } catch (error) {
      console.error('Controller error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown'
        });
      }
    }
  }
}
