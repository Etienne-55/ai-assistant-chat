import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChatController } from './controllers/chat.controller';
import { ChatService } from './services/chat.service';
import { ToolService } from './services/tool.service';
import { uploadMiddleware } from './middleware/upload.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const toolService = new ToolService();
const chatService = new ChatService(toolService);
const chatController = new ChatController(chatService);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/chat', 
  uploadMiddleware.single('pdf'),
  (req, res) => chatController.handleChat(req, res)
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
