# H-Kids Administrative AI Assistant

Production-ready monorepo foundation for the first H-Kids AI platform module: an Administrative AI Assistant.

## Stack

- Monorepo: npm workspaces
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database readiness: PostgreSQL configuration scaffold with `pg`
- Tooling: ESLint + Prettier

## Project Structure

```text
.
├── apps
│   ├── api
│   │   ├── src
│   │   │   ├── config
│   │   │   ├── routes
│   │   │   ├── app.js
│   │   │   ├── index.js
│   │   │   └── server.js
│   │   ├── .env.example
│   │   └── package.json
│   └── web
│       ├── src
│       │   ├── components
│       │   ├── layouts
│       │   ├── pages
│       │   ├── App.jsx
│       │   ├── index.css
│       │   └── main.jsx
│       ├── .env.example
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
├── eslint.config.js
├── package.json
└── README.md
```

## Available Pages

- `/login`
- `/dashboard`
- `/assistant`

The dashboard includes:

- 1 active card: Administrative Assistant
- 3 disabled cards: Community Manager, Sales Agent, HR Agent

## API

### Health Check

`GET /api/health`

Response:

```json
{
  "status": "ok"
}
```

## Environment Variables

Copy the example files before running locally:

- `apps/api/.env.example` -> `apps/api/.env`
- `apps/web/.env.example` -> `apps/web/.env`

## Install

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Production Build

```bash
npm run build
```

Build outputs:

- Frontend bundle: `apps/web/dist`
- Backend bundle: `apps/api/dist`

## Code Quality

```bash
npm run lint
npm run format:check
```

## Notes

- Claude is intentionally not integrated.
- No business logic or document generation is implemented.
- PostgreSQL is scaffolded for future integration but not connected during startup.
