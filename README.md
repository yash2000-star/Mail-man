# Mail-man

An AI-powered Gmail client. Mail-man signs you in with Google, reads your inbox, and uses your own AI API key to sort mail, summarise it, draft replies, pull out to-dos, and answer questions about your inbox.

**Live:** https://mail-man-yash.vercel.app · **[Try the demo](https://mail-man-yash.vercel.app/demo)** (sample inbox, no sign-in or API key needed)

## Features

- **Smart inbox**: each email is categorised (Important, Promotions, Social, Spam, General) with a one-line summary.
- **Suggested replies and Needs Reply**: a draft reply for emails that need one, sent in one click, and a list of everything still waiting on you.
- **Smart Labels**: describe a label in plain English and the AI applies it to new mail, and optionally to your recent inbox.
- **To-dos**: action items and deadlines pulled from your mail into a dashboard grouped by overdue, today and upcoming; add your own or turn any email into a to-do.
- **Full mail client**: conversations, every Gmail folder, search, paging, drafts with autosave, attachments, reply and forward with the original quoted.
- **Compose assistant**: rewrite a draft in a chosen tone or language, or write one from a short instruction.
- **Inbox chat**: ask questions about your recent mail.
- **Bring your own key, any provider**: every AI feature works with a Google Gemini, OpenAI or Anthropic Claude key. Keys are encrypted (AES-256-GCM) in MongoDB and only used server-side; the browser never sees them.
- Archive, trash, spam, star and read/unread actions sync back to Gmail; responsive layout for mobile.
- **Live demo** at `/demo`: the real app running against an in-browser sample mailbox (`lib/demo`), so nothing reaches Gmail, the database or an AI provider.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion, lucide-react |
| Auth | NextAuth 4 with Google OAuth (Gmail read, send, modify scopes) |
| Database | MongoDB with Mongoose |
| AI | Google Gemini, OpenAI and Anthropic SDKs behind one interface (`lib/ai.ts`) |
| Hosting | Vercel |

## Project structure

```
app/
  page.tsx            Landing page when signed out, mail client when signed in
  demo/               The app on a sample inbox (no sign-in)
  setup/              First-run onboarding: add an AI key
  privacy/, terms/    Privacy policy and terms of service
  api/
    auth/             NextAuth Google sign-in and token refresh
    classify/         Categorise + summarise + suggest replies (cached per email)
    ai/tasks/         To-do extraction and Smart Labels
    ai/reply/         Reply drafting
    ai/enhance/       Compose assistant
    chat/             Inbox chat (Gemini / OpenAI / Anthropic)
    gmail/            Mailbox lists, messages, conversations, attachments
    action/           Gmail label changes (archive, trash, star, read)
    send/, drafts/    Send email and save drafts through Gmail
    labels/           Smart Labels: create, edit, delete, scan, assign
    tasks/            To-do list
    user/             User settings and AI keys; DELETE removes all of a user's data
components/           UI components (MailApp, feed, reading pane, compose, sidebar, chat, ...)
lib/                  Gmail, MIME, AI provider layer, auth, encryption, env helpers
lib/demo/             Sample mailbox and in-browser API used by /demo
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

4. Open http://localhost:3000, sign in with Google, and add an AI key when asked: Gemini (free from [Google AI Studio](https://aistudio.google.com/app/apikey)), [OpenAI](https://platform.openai.com/api-keys) or [Anthropic](https://console.anthropic.com/settings/keys).

### Google OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Gmail API**.
2. Configure the **OAuth consent screen**: user type *External*, add the scopes `gmail.readonly`, `gmail.send` and `gmail.modify`, set the privacy policy and terms links to `https://<your-domain>/privacy` and `https://<your-domain>/terms`, and add your Google account under **Test users**.
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
| `npm test` | Unit tests (Vitest): encryption, rate limiting, MIME building, validation, demo API |

CI runs lint, type-check, tests and build on every pull request and every push to `main`.

## Security

- Email HTML is rendered in a sandboxed iframe with scripts disabled, and every page is served with a Content-Security-Policy, HSTS and anti-framing headers (`next.config.ts`).
- AI API keys are encrypted at rest with AES-256-GCM, read only on the server, and never returned to the browser. Keys saved in the older AES-CBC format are re-encrypted automatically the next time they are read.
- Every AI and settings API route requires a signed-in session and is rate limited per user (`lib/rate-limit.ts`, counters in MongoDB so limits hold across serverless instances).
- The settings API only accepts a fixed set of fields, and outgoing mail headers are validated.
- Settings > **Delete my data** removes everything Mail-man stores for a user and revokes its Google access.

## License

[MIT](LICENSE)
