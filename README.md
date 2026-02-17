# White Ninja AI backend port 3006 frontend at 5585

**Multi-Agent Website Builder** — Watch 5 AI agents build your website in real-time.

Describe what you want, then watch Kuba (Architect), Maja (Frontend Dev), Leo (CSS Stylist), Nova (Code Reviewer), and Rex (QA Tester) discuss, code, argue, review, and polish your site live.

## Quick Start

```bash
# Backend
cd backend
npm install
echo "DEEPSEEK_API_KEY=your_key" > .env
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5585

## Stack

- React 18 + Vite 5 + Framer Motion
- Node.js + Express + WebSocket
- DeepSeek API
- Pure CSS design system (dark theme)
