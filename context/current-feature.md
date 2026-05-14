# Current Feature: Phase 0 — Foundation

## Status

In Progress

## Goals

- Install all dependencies: shadcn/ui, Prisma + Neon, Clerk, Pusher, Zod, React Hook Form
- Set up `.env.local` with all required environment variables
- Configure Clerk middleware and auth pages (sign-in, sign-up)
- Initialize Prisma schema with all 5 models (User, QuizSet, Question, Room, Player)
- Run first migration against Neon DB
- Create Prisma client singleton (`src/lib/prisma.ts`)
- Create Pusher server and browser clients (`src/lib/pusher.ts`, `src/lib/pusher-client.ts`)
- Create Pusher auth API route
- Set up Inter font via `next/font`
- Define shared types (`src/types/quiz.ts`, `src/types/room.ts`)
- `npm run build` passes with no errors

## Notes

- No new UI in this phase — infrastructure only
- Prisma uses `String[]` for `choices` (not `Json`) for better type safety
- Pusher auth route skips session validation for now — Phase 2 will add it
- No need to create `User` DB records yet — that comes in Phase 1 via Clerk webhook
- `.env.local` is already gitignored by Next.js automatically

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
