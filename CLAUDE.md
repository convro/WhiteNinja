# WHITE NINJA AI — Multi-Agent Website Builder

## Project Overview
Real-time collaborative AI website builder. 5 AI agents (Architect, Frontend Dev,
CSS Stylist, Code Reviewer, QA Tester) work together to build websites while the
user watches the entire process live in a premium dark UI.

## Tech Stack
- **Frontend:** React 18 + Vite 5 + Framer Motion + Lucide React + Sonner
- **Backend:** Node.js + Express + WebSocket (ws) + DeepSeek API (via OpenAI SDK)
- **Styling:** Pure CSS with CSS custom properties (NO Tailwind/CSS-in-JS)
- **Fonts:** DM Sans (main), DM Mono (code)

## Development

### Setup
```bash
# Backend
cd backend && npm install
cp .env.example .env  # Add your DEEPSEEK_API_KEY
npm run dev           # Starts on port 3001

# Frontend
cd frontend && npm install
npm run dev           # Starts on port 5173
```

### Environment Variables
```
DEEPSEEK_API_KEY=your_key_here
PORT=3001
```

## Architecture

### App Flow (Phase State Machine)
```
WELCOME → BRIEF → CONFIG → BUILDING → REVIEW
```

### Building Sub-Phases
```
PLANNING → SCAFFOLDING → CODING → REVIEWING → FIXING → TESTING → POLISHING → COMPLETE
```

### Frontend Structure
```
frontend/src/
├── App.jsx                    # Phase state machine
├── index.css                  # Design system (CSS variables)
├── hooks/
│   ├── useBuilderSocket.jsx   # WebSocket connection + event routing
│   └── useFileSystem.jsx      # Virtual file tree state management
├── components/
│   ├── AgentFeed.jsx          # Real-time activity stream (center panel)
│   ├── AgentMessage.jsx       # Individual message/action cards
│   ├── AgentAvatar.jsx        # Agent avatars with color coding
│   ├── FileTree.jsx           # Virtual file explorer (left panel)
│   ├── LivePreview.jsx        # iframe + code view (right panel)
│   ├── BuildProgress.jsx      # Progress bar + phase milestones
│   └── ConflictResolver.jsx   # Agent conflict voting UI
└── screens/
    ├── WelcomeScreen.jsx      # Landing page
    ├── BriefScreen.jsx        # Website brief input
    ├── ConfigScreen.jsx       # Build configuration
    ├── BuildScreen.jsx        # MAIN — 3-panel build view
    └── ReviewScreen.jsx       # Build complete + download
```

### Backend Structure
```
backend/
├── server.js                  # Express + WS + DeepSeek orchestration
├── agents/                    # Agent personality + system prompts
│   ├── architect.js           # Kuba — planner (blue)
│   ├── frontend-dev.js        # Maja — coder (green)
│   ├── stylist.js             # Leo — designer (purple)
│   ├── reviewer.js            # Nova — reviewer (red)
│   └── qa-tester.js           # Rex — tester (yellow)
└── builder/
    ├── fileManager.js         # Virtual file system (Map-based)
    ├── templateEngine.js      # Base templates by site type
    └── bundler.js             # ZIP download builder
```

## WebSocket Protocol

### Client → Server
```javascript
{ type: "start_build", brief: "...", config: {...} }
{ type: "user_feedback", message: "make the header bigger" }
{ type: "resolve_conflict", conflictId: "...", choice: "agent_a" | "agent_b" | "custom" }
{ type: "pause_build" }
{ type: "resume_build" }
{ type: "approve_phase" }
```

### Server → Client
```javascript
{ type: "agent_thinking", agentId: "architect", thought: "..." }
{ type: "agent_message", agentId: "...", message: "...", targetAgent: "..." }
{ type: "file_created", path: "...", content: "...", agentId: "..." }
{ type: "file_modified", path: "...", diff: {...}, agentId: "..." }
{ type: "agent_conflict", id: "...", agentA: {...}, agentB: {...}, about: "..." }
{ type: "review_comment", agentId: "reviewer", file: "...", line: 12, comment: "..." }
{ type: "bug_report", agentId: "qa-tester", severity: "high", description: "..." }
{ type: "phase_change", from: "CODING", to: "REVIEWING" }
{ type: "build_progress", percent: 65, milestone: "..." }
{ type: "preview_update", html: "...", css: "...", js: "..." }
{ type: "build_complete", files: [...], summary: "..." }
```

## Agent System Prompts

Agents use structured output formats parsed by the backend:

```
===THINKING===
[reasoning visible to user]
===END_THINKING===

===FILE_CREATE: path/to/file.html===
[complete file content]
===END_FILE===

===FILE_MODIFY: path/to/file.css===
[complete updated content]
===END_FILE===

===MESSAGE: @maja===
[inter-agent message]
===END_MESSAGE===

===REVIEW_COMMENT: src/index.html:23===
[review issue]
===END_REVIEW===

===BUG_REPORT: severity=high===
Issue: [description]
===END_BUG===
```

## Design System

All design tokens are CSS custom properties in `frontend/src/index.css`:

- `--bg-primary: #0a0a0f` through `--bg-card: #181b27` — backgrounds
- `--text-primary: #edf2f7` through `--text-tertiary: #475569` — text
- `--accent: #3b82f6` — primary accent (blue)
- `--architect: #3b82f6`, `--frontend-dev: #22c55e`, `--stylist: #a855f7`, `--reviewer: #ef4444`, `--qa-tester: #eab308` — agent colors
- `--font-main: 'DM Sans'`, `--font-mono: 'DM Mono'`

## The 5 Agents

| Agent | Name | Color | Role |
|-------|------|-------|------|
| architect | Kuba 🏗️ | #3b82f6 | Plans structure, creates files |
| frontend-dev | Maja ⚡ | #22c55e | Writes HTML/JS code |
| stylist | Leo 🎨 | #a855f7 | All CSS, animations, design |
| reviewer | Nova 🔍 | #ef4444 | Code review, bug catching |
| qa-tester | Rex 🧪 | #eab308 | Testing, QA sign-off |

## Code Style
- Functional React components with hooks only
- CSS custom properties for all design tokens
- Framer Motion for animations (spring-based)
- Toast notifications via Sonner
- BEM-inspired CSS class naming
- No Tailwind, no CSS-in-JS, no styled-components
