# Current Feature: Phase 3-5 — Landing Page & Avatar

## Status

In Progress

## Goals

- `/` แสดง avatar grid + name + code form (Gartic Phone style)
- เลือก avatar → highlight, default `cat`
- Submit → validate room → joinRoom → sessionStorage เก็บ `{ playerId, playerName, avatar }`
- Redirect ไป `/play/[code]/lobby`
- `/play` redirect ไป `/`
- Pusher auth ส่ง `avatar` ใน `user_info`
- Lobby player list แสดง avatar image
- Host lobby player list แสดง avatar image
- QuizCard มีปุ่ม "▶ Host Game"
- `npm run build` ผ่าน

## Notes

- Depends on Phase 2-1 (`joinRoom`), Phase 2-3 (LobbyView), Phase 2-4 (HostRoomView)
- Files: `page.tsx`, `play/page.tsx`, `pusher/auth/route.ts`, `LobbyView.tsx`, `HostRoomView.tsx`, `QuizCard.tsx`
- 9 SVG avatars ใน `public/avatar/`: bear, bird, cat, dog, fish, frog, octopus, owl, rabbit
- `joinRoom` เรียกจาก landing แทน lobby → lobby ข้าม name entry ถ้ามี identity ใน sessionStorage
- LobbyView ยังคง fallback name entry ไว้สำหรับเข้า URL ตรง
- ไม่ต้อง Prisma migration — avatar เก็บใน sessionStorage เท่านั้น

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Phase 0 — Foundation: installed all dependencies (Prisma v7/Neon, Clerk, Pusher, shadcn/ui, Zod, React Hook Form), configured middleware/auth pages, schema + migration, Pusher clients, Inter font, shared types
- Phase 1-1 — Clerk User Sync: สร้าง webhook route `/api/webhooks/clerk` ใช้ `verifyWebhook` จาก `@clerk/nextjs/webhooks` (Clerk v7), สร้าง `User` ใน DB เมื่อ `user.created` ยิงมา, ทดสอบผ่าน ngrok + Google sign-up สำเร็จ
- Phase 1-2 — Quiz Server Actions: สร้าง `src/actions/quiz.ts` พร้อม 5 actions (`createQuizSet`, `updateQuizSet`, `deleteQuizSet`, `upsertQuestion`, `deleteQuestion`) auth-gated, ownership check, try/catch ครบ, return `{ success, data, error }` pattern
- Phase 1-3 — Dashboard Page: สร้าง `(dashboard)` layout + `/dashboard` page แสดง quiz sets ของ host พร้อม empty state, Edit/Delete actions และ `QuizCard` component
- Phase 1-4 — Create Quiz Page: สร้างหน้า `/quiz/new` พร้อม React Hook Form + Zod validation, submit → `createQuizSet` → redirect `/quiz/[id]`, error แสดง alert
- Phase 1-5 — Edit Quiz Page: สร้างหน้า `/quiz/[id]` พร้อม `QuizEditor` และ `QuestionEditor`, แก้ title/description, เพิ่ม/แก้ไข/ลบ questions, `router.refresh()` หลัง mutation เพื่อ sync UI
- Phase 2-1 — Room Server Actions & Pusher Auth: สร้าง `src/actions/room.ts` (`createRoom`, `joinRoom`, `startGame`), แก้ Pusher auth รองรับ presence channel พร้อม member data, เพิ่ม `authEndpoint` ใน pusher-client
- Phase 2-2 — Play Entry Page: สร้างหน้า `/play` กรอก room code + API route `GET /api/rooms/[code]` validate room
- Phase 2-3 — Player Lobby: สร้าง `/play/[code]/lobby` + `LobbyView` (Pusher presence, player list, chat) + chat API route
- Phase 2-4 — Host Room View: สร้าง `/room/[code]` + `HostRoomView` (Pusher presence, read-only chat, Start Game) + `HostGameButton` ใน QuizEditor
- Phase 3-1 — Game Server Actions: สร้าง `src/actions/game.ts` (`revealQuestion`, `revealResult`, `nextQuestion`, `endGame`) auth-gated, try/catch ครบ, broadcast Pusher events บน `room-{code}`
- Phase 3-2 — Player Game Screen: สร้าง `/play/[code]/game` + `PlayerGameView` state machine (waiting→question→answered→result→leaderboard→ended)
- Phase 3-3 — Host Game Controls: อัปเดต `/room/[code]` รองรับ ACTIVE/FINISHED + `HostGameView` (live counts, reveal, next, end)
- Phase 3-4 — Answer Submit API Route: สร้าง `POST /api/rooms/[code]/answer` verify player, update score, broadcast `answer-submitted`
