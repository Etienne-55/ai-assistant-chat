<!-- o projeto tem a funcao de demonstrar a habilidade de um modelo de llm usar ferramentas. no caso -->
<!-- foram introduzidas 3 em especifico. uma ferramenta de conversao de moeda, uma de inforrmacao -->
<!-- sobre o clima e um leitor de pdf. o projeto so precisa de um comando para rodar. docker compose up -->
<!-- . apos esse comando 3 containers serao criados. o back, front e o container do ollama. no qual -->
<!-- sera baixado o modelo chines   qwen2.5:1.5b-instruct-q4_K_M  que pesa aproximadamente 980kb. -->
<!-- o usuario podera interagir normalmente. porem dada as informacoes que correspondam a uma das  -->
<!-- 3 ferramentas. a ia podera decidir se faz a chamada da ferramenta ou nao. o projeto foi pensado  -->
<!-- para rodar o mais rapido perdendo o minimo de tempo possivel. (futuras possiveis melhorias, -->
<!-- adicionar rag, mais ferramentas. funcao de ativar as ferramenta disponiveis etc) -->
<!-- comando docker linux mac e windows ou mac e nvidia nao sei -->
<!-- tudo roda no localhost3000 apenas por uma rota /chat no backend  -->

A demonstration of agentic AI using tool calling. The LLM autonomously decides when to use three specialized tools: currency conversion, weather information, and PDF reading.

![App Screenshot](./assets/screenshot_1.png)
![Chat Interface](./assets/screenshot_2.png)

## Features

- **Agentic AI**: Model decides autonomously when to use tools
- **3 Integrated Tools**: Weather, currency conversion, PDF analysis
- **Streaming Responses**: Real-time AI responses via SSE
- **Containerized**: Single command deployment

## Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB RAM minimum

### Installation

**With NVIDIA GPU:**
```bash
docker compose -f docker-compose.nvidia.yml up
```

**CPU Only (Mac/Windows/Linux):**
```bash
docker compose up
```

On first run, the Qwen2.5 1.5B model (~980MB) will be downloaded automatically.

**Access:** http://localhost:3000

## Tools

| Tool | Function | Example |
|------|----------|---------|
| Weather | Current weather data | "What's the weather in Tokyo?" |
| Currency | Exchange rates | "Convert 100 USD to BRL" |
| PDF Reader | Extract text from PDFs | *Upload PDF* "Summarize this" |

## Architecture

```
Frontend (React + TypeScript)
    ↓ HTTP + SSE
Backend (Node.js + Express)
    ↓ Tool orchestration
Ollama (Qwen2.5 1.5B)
```

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS  
**Backend:** Node.js, Express, Vercel AI SDK  
**AI/ML:** Ollama, Qwen2.5 1.5B Instruct (Q4_K_M quantized)

## Project Structure

```
├── frontend/          # React app
├── backend/           # Node.js server
│   └── src/tools/     # Tool implementations
├── assets/            # Screenshots
├── docker-compose.yml
└── docker-compose.nvidia.yml
```

## Performance

- **Cold Start:** ~2-3 min (model download)
- **Warm Start:** ~10 sec
- **Response Time:** 2-5 sec per query

## Future Enhancements

- RAG integration for document retrieval
- Additional tools (web search, image generation)
- Tool enable/disable UI
- Multi-turn conversation memory
- Voice input support

## Troubleshooting

**Slow download?** First run downloads 980MB model  
**PDF not readable?** OCR support planned for scanned documents  
**Out of memory?** Ensure 8GB+ RAM available  
**GPU not detected?** Verify NVIDIA Container Toolkit:
```bash
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

## Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend  
cd frontend && npm install && npm run dev

# Ollama (local)
ollama serve
ollama pull qwen2.5:1.5b-instruct-q4_K_M
```

## API Reference

### POST /chat

Endpoint for chat interactions with tool calling support.

**Request:**
```typescript
{
  message: string;
  pdf?: File;  // Optional PDF upload
}
```

**Response:** Server-Sent Events (SSE) stream with:
- Text chunks
- Tool calls
- Tool results

## License

MIT
```

