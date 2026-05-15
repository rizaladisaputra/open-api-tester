# ⚡ Modern API Studio

Modern API Studio is a powerful OpenAPI and Swagger designer built in the browser. It provides a visual interface for constructing endpoints, generating specs, and executing HTTP requests against your APIs — with cloud persistence via Supabase.

## ✨ Features

- **Visual API Designer** — Build endpoints, parameters, headers, request/response bodies without writing YAML by hand
- **Raw JSON Schema Inference** — Paste JSON payloads and automatically infer the OpenAPI schema
- **Advanced HTTP Test Runner** — A built-in Postman-like panel with dynamic path params, custom headers, editable JSON bodies, and detailed response metrics
- **Format Converter** — Convert between OpenAPI 3.0 ↔ Swagger 2.0 and JSON ↔ YAML
- **Mock Data Generator** — Auto-generate sample JSON payloads from your OpenAPI schemas
- **Real-Time Preview** — Instantly view generated YAML/JSON as you build
- **Tag & Component Management** — Organize APIs into logical tags with reusable Schema Components and Global Security configs
- **Cloud Persistence** — Projects are saved to Supabase (per-user, with Row Level Security)
- **Local Persistence** — Zustand persist keeps your last spec in browser storage as a fallback

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| State Management | Zustand |
| Code Editor | Monaco Editor (VS Code core) |
| Styling | Vanilla CSS — custom Catppuccin-inspired dark theme |
| Auth & DB | Supabase (Auth + PostgreSQL + Row Level Security) |

## 📦 Project Structure

```text
OpenAPI/
├── apps/
│   ├── client/          # React application (Vite)
│   └── server/          # Optional backend proxy
├── packages/
│   ├── types/           # Shared TypeScript definitions
│   └── utils/           # Schema inference, spec conversion logic
├── supabase/
│   └── migrations/      # SQL migrations for Supabase
└── package.json         # Monorepo root (npm workspaces)
```

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm v7+ (for workspace support)
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example and fill in your Supabase credentials:

```bash
cp apps/client/.env.example apps/client/.env
```

**`apps/client/.env`**

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> Find these in your Supabase project under **Settings → API**.

### 3. Run the Supabase migration

In your [Supabase SQL Editor](https://app.supabase.com), run:

```bash
# Paste and execute the contents of:
supabase/migrations/001_create_projects.sql
```

This creates the `projects` table with Row Level Security — users can only access their own projects.

### 4. Start the development server

```bash
npm run dev --workspace=@modern-api-studio/client
# or
cd apps/client && npm run dev
```

App runs at **http://localhost:5173**

## 🗄 Database Schema

### `projects` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | References `auth.users(id)` |
| `name` | `text` | Project display name |
| `spec_data` | `jsonb` | Full OpenAPI spec (internal format) |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Auto-updated on every change |

Row Level Security is enabled — all queries are automatically scoped to the authenticated user.

## 🏗 Building for Production

```bash
cd apps/client
npm run build
```

Static assets are output to `apps/client/dist/`.

## 🤝 Contributing

Contributions are welcome! Open an issue or submit a pull request for new features, bug fixes, or enhancements.

## 📄 License

MIT License
