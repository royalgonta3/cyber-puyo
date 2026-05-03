# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint check
```

## Stack

- **Next.js 16** with App Router (`src/app/`)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4** — configured via `postcss.config.mjs`, no `tailwind.config.js` needed
- No test framework installed

## Architecture

All routes live under `src/app/` using the App Router file convention (`page.tsx`, `layout.tsx`). Client-side interactive components must be marked `"use client"`. Shared components go in `src/components/`, game/utility logic in `src/lib/`.

Tailwind v4 is imported via `@import "tailwindcss"` in `globals.css` — do not use the v3 `@tailwind` directives.
