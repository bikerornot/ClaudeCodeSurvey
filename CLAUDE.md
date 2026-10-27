# Survey App (Veloxo)

A multi-tenant survey platform with image, multiple choice, and checkbox survey types. Built with vanilla JS, Tailwind CSS, and Supabase. No framework — pure static files deployed to Vercel.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Auth**: Email/password + Google OAuth via Supabase
- **Deployment**: Vercel (static, no build step needed)
- **Package manager**: npm

## Project Structure

```
index.html        # Landing page
admin.html        # Survey creation (auth required)
vote.html         # Public voting interface
results.html      # Results viewer (owner only)
surveys.html      # Survey management list

js/
  config.js       # Supabase client + auth helpers
  admin.js        # Survey creation logic
  vote.js         # Voting logic
  results.js      # Results visualization

css/
  input.css       # Tailwind directives + custom components
  tailwind.css    # Compiled output (do not edit manually)

img/logo.png            # Veloxo logo
supabase-setup.sql      # DB schema + RLS policies
```

## Commands

```bash
npm run build    # Compile Tailwind CSS (input.css → tailwind.css)
npm run watch    # Watch and recompile CSS on changes
npm start        # Local dev server on http://localhost:8080
```

Always run `npm run build` after editing `css/input.css`.

## Database Schema (Supabase)

- **surveys** — `id, title, description, question, type, user_id, created_at`
- **images** — `id, survey_id, storage_path, image_url, title, created_at` (used for all option types)
- **votes** — `id, survey_id, image_id, created_at`

Survey types: `image`, `multiple_choice`, `checkbox`

## Key Patterns

- One JS module per page; shared auth/config in `config.js`
- DOM built via `document.createElement()` — no templating library
- `escapeHtml()` used for all user-generated content to prevent XSS
- Duplicate vote prevention via `localStorage` flags
- Owner-only gates check `session.user.id === survey.user_id` client-side
- Supabase RLS is permissive — app logic handles ownership scoping
- Embed support on vote page via `?embed=true` query param
- CSS custom components: `.form-input`, `.form-label`, `.image-card`, `.choice-button`, `.checkbox-label`

## Deployment

- Vercel auto-deploys from `main` branch
- No build command needed on Vercel (`vercel.json` has `buildCommand: ""`)
- Output directory is project root (`.`)
- Supabase anon key is public and safe to commit (`config.js`)
