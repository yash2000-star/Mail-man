# Mail-man

An AI-powered Gmail client. Mail-man signs you in with Google, reads your inbox, and uses your own AI API key to sort mail, summarise it, draft replies, pull out to-dos, and answer questions about your inbox.

## Features

- **Smart inbox**: each email is categorised (Important, Promotions, Social, Spam, General) with a one-line summary.
- **Suggested replies**: a draft reply for emails that need one, sent in one click.
- **To-do extraction**: action items and deadlines pulled from your mail into a task dashboard.
- **Smart Labels**: describe a label in plain English and the AI applies it to matching emails.
- **Compose assistant**: rewrite a draft in a chosen tone or language, or write one from a short instruction.
- **Inbox chat**: ask questions about recent mail using Gemini, GPT-4o or Claude.
- **Bring your own key**: AI calls use the user's own key, stored encrypted (AES-256) in MongoDB.
- Archive, trash, star and read/unread actions sync back to Gmail; responsive layout for mobile.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion, lucide-react |
| Auth | NextAuth 4 with Google OAuth (Gmail read, send, modify scopes) |
| Database | MongoDB with Mongoose |
| AI | Google Gemini, OpenAI, Anthropic SDKs |
| Hosting | Vercel |

## Project structure

```
app/
  page.tsx            Main app (landing page when signed out, mail client when signed in)
  setup/              First-run onboarding: add an AI key
  api/
    auth/             NextAuth Google sign-in and token refresh
    classify/         Categorise + summarise + suggest replies (cached per email)
    ai/tasks/         To-do extraction and Smart Labels
    ai/reply/         Reply drafting
    ai/enhance/       Compose assistant
    chat/             Inbox chat (Gemini / OpenAI / Anthropic)
    action/           Gmail label changes (archive, trash, star, read)
    send/             Send email through Gmail
    user/             User settings: AI keys, labels, tasks
components/           UI components (feed, reading pane, compose, sidebar, chat, ...)
lib/                  MongoDB connection, encryption, env helpers
models/               Mongoose models: User, EmailAnalysis
```

## Run it locally

Requirements: Node.js 20 or newer, a MongoDB database, and a Google Cloud project.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy the environment template and fill it in (each variable is explained in the file):

   ```bash
   cp .env.example .env.local
   ```

3. Set up Google OAuth (see below), then start the dev server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000, sign in with Google, and add a Gemini API key (free from [Google AI Studio](https://aistudio.google.com/app/apikey)) when asked.

### Google OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Gmail API**.
2. Configure the **OAuth consent screen**: user type *External*, add the scopes `gmail.readonly`, `gmail.send` and `gmail.modify`, and add your Google account under **Test users**.
3. Create an **OAuth client ID** of type *Web application* with these authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-domain>/api/auth/callback/google`
4. Put the client ID and secret in `.env.local`.

While the app is in Google's *Testing* mode, only accounts listed as test users (up to 100) can sign in. Gmail scopes are classed as restricted, so opening sign-in to everyone requires Google's verification and security assessment.

## Deploy on Vercel (free tier)

1. Create a free [MongoDB Atlas](https://www.mongodb.com/atlas) M0 cluster. Under **Network Access**, allow `0.0.0.0/0`, since Vercel functions don't have fixed IPs.
2. Import the repository into [Vercel](https://vercel.com/new) (Hobby plan).
3. Add every variable from `.env.example` in **Project Settings > Environment Variables**, with `NEXTAUTH_URL` set to your production URL.
4. Add the production redirect URI to the Google OAuth client (step 3 above) and deploy.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type-check |

CI runs lint, type-check and build on every pull request and every push to `main`.

## Security

- Email HTML is rendered in a sandboxed iframe with scripts disabled.
- AI API keys are encrypted at rest with AES-256.
- The settings API only accepts a fixed set of fields, and outgoing mail headers are validated.
