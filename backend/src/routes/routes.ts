import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { ChatService } from '../services/chat.service';
import { ToolService } from '../services/tool.service';
import { uploadMiddleware } from '../middleware/upload.middleware';

export const createChatRoutes = (): Router => {
  const router = Router();

  const toolService = new ToolService();
  const chatService = new ChatService(toolService);
  const chatController = new ChatController(chatService);

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.post(
    '/chat',
    uploadMiddleware.single('pdf'),
    (req, res) => chatController.handleChat(req, res)
  );

  return router;
};

