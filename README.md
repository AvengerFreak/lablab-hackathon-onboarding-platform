# LabLab Hackathon Onboarding Platform

A web application for managing hackathon participant onboarding — from sign-up through team formation, approvals, and infrastructure provisioning.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Supabase Setup](#supabase-setup)
- [Deployment](#deployment)

---

## Prerequisites

- **Node.js** 20.x or later
- **npm** 9.x or later
- A **Supabase** project (free tier works)
- A **GitHub** account (for OAuth login)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/lablab-onboarding.git
cd lablab-onboarding

# 2. Install dependencies
npm install

# 3. Set up environment variables (see next section)
cp .env.example .env
# Edit .env with your Supabase project credentials

# 4. Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Environment Variables

The app requires two Supabase environment variables. They are **never committed** to the repository.

| Variable | Description | Where to find it |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous public key | Supabase Dashboard → Settings → API → anon public key |

### Local setup

```bash
cp .env.example .env
```

Then open `.env` and replace the placeholder values with your real credentials.

> ⚠️ **Never commit `.env` to the repository.** It is already in `.gitignore`.

---

## Project Structure

```
├── .github/workflows/deploy.yml   # CI/CD — deploys to Vercel
├── public/                         # Static assets
├── src/
│   ├── components/                 # Shared UI components
│   │   ├── Auth.tsx               # Sign-in / sign-up form
│   │   └── AppLayout.tsx          # Main layout wrapper
│   ├── hooks/                     # React hooks
│   │   └── useAuth.ts            # Auth state, role detection, navigation
│   ├── lib/                       # Core utilities
│   │   ├── config.ts             # App constants (name, tagline)
│   │   ├── supabase.ts           # Supabase client setup
│   │   └── database.types.ts     # TypeScript types for DB schema
│   ├── pages/                     # Route pages
│   │   ├── WizardPlaceholder.tsx  # Participant onboarding wizard
│   │   ├── DashboardPlaceholder.tsx # Organizer dashboard
│   │   └── HackathonsPlaceholder.tsx # Hackathon management
│   ├── App.tsx                    # Root component + routing
│   ├── main.tsx                   # App entry point
│   └── index.css                  # Global styles + Tailwind theme tokens
├── supabase/functions/            # Supabase Edge Functions
│   ├── import-teams/             # CSV team import
│   ├── verify-fireworks/         # Submission verification
│   └── create-team-infrastructure/ # Auto-provision GitHub repos & Discord channels
├── .env.example                   # Template for local environment variables
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json                    # Vercel deployment config
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

---

## Supabase Setup

This project uses Supabase for authentication, database, and Edge Functions.

### Database tables

The following tables are expected in your Supabase project:

- **organizers** — hackathon organizers (linked to auth users)
- **hackathons** — hackathon events
- **teams** — participant teams
- **participants** — individual participants (linked to teams)
- **organizer_hackathons** — which organizers manage which hackathons
- **audit_logs** — activity tracking

### Authentication

- **Email / password** — built-in sign-up and sign-in
- **GitHub OAuth** — requires a GitHub OAuth App configured in your Supabase Auth settings
- Email confirmation can be enabled or disabled in the Supabase dashboard (Auth → Settings → General → Confirm email)

### Edge Functions

To deploy Edge Functions locally:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Deploy a function
supabase functions deploy import-teams
```

---

## Deployment

The project deploys to **Vercel** via GitHub Actions.

### CI/CD workflow

On every push to `main` (and on pull requests), the workflow at `.github/workflows/deploy.yml`:

1. Installs dependencies
2. Creates a `.env` file from **GitHub Action secrets** (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
3. Builds the project with Vercel CLI
4. Deploys to Vercel
5. Comments a preview URL on pull requests

### GitHub Secrets required

Configure these in your repository: **Settings → Secrets and variables → Actions**

| Secret | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VERCEL_TOKEN` | Vercel API token (from Account Settings → Tokens) |
| `VERCEL_TEAM_ID` | Your Vercel team ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID |

### Vercel environment variables

The same two Supabase variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) should also be added in the Vercel dashboard under your project → Settings → Environment Variables.