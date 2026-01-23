# Kensan AI

AI service for Kensan learning management app.

## Features

- Chat endpoint for general AI assistance
- Morning advice (planning support)
- Evening reflection
- Weekly review
- User memory and facts storage
- Interaction logging with feedback

## Running

### Docker (recommended)

```bash
# From project root
make rebuild
```

### Local development

```bash
cd kensan-ai
pip install -e .
uvicorn kensan_ai.main:app --reload --port 8089
```

## API Endpoints

- `GET /health` - Health check
- `POST /chat` - Chat with AI
- `POST /chat/stream` - Streaming chat
- `POST /advice` - Morning planning advice
- `POST /reflect` - Evening reflection
- `POST /review` - Weekly review
- `POST /interactions/{id}/feedback` - Submit feedback

## Environment Variables

See `.env.example` for configuration options.
