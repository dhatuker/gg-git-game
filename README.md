# GG Git Game

A browser game for learning git by watching the history grow. Players type real git commands into a simulated terminal, and the commit graph and the three git areas (working directory, staging area, repository) update after every command.

- 25 levels in six tracks, from `git init` to `git push` and rejected pushes.
- A sandbox (`/id/sandbox`, `/en/sandbox`) that imports the history of your own repo from `git log` and lets you experiment freely. Nothing is ever written back to the real repo.
- Indonesian and English (`/id`, `/en`). Visiting `/` picks a language from the `gg-lang` cookie or the browser.
- Progress is saved in the browser (localStorage).

## Stack

Next.js (App Router) with React and TypeScript, Tailwind CSS v4, and Vitest. Git itself is simulated by a small engine in `engine/`, so nothing runs on a server.

## Project layout

| Folder | What lives there |
| --- | --- |
| `app/` | Routes: `/[lang]`, `/[lang]/levels`, `/[lang]/play/[level]`, `/[lang]/sandbox` |
| `engine/` | The mini git engine: parser, commands, repo state |
| `levels/` | Level definitions, tracks (tiers), summaries |
| `sandbox/` | Turning pasted `git log` output into a repo state |
| `ui/` | React components and client-side state |
| `i18n/` | Indonesian and English dictionaries |
| `docs/` | Design specs and implementation plans |

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Vitest
npm run lint    # ESLint
npm run build   # production build
```

Deployed on Vercel from the `main` branch.
