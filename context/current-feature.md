# Current Feature: Phase 2-3 — Player Lobby

## Status

In Progress

## Goals

- `/play/[code]/lobby` โหลดได้ ไม่มี error
- แสดงหน้ากรอกชื่อถ้ายังไม่ได้ join
- กรอกชื่อ → join สำเร็จ → เห็นหน้า lobby
- รายชื่อผู้เล่น update real-time เมื่อมีคนเข้า/ออก
- ส่ง chat message → เห็นในทุก client
- เมื่อ host กด Start → redirect ไป `/play/[code]/game`
- ถ้า room ไม่มีหรือไม่ใช่ LOBBY → 404
- `npm run build` ผ่าน

## Notes

- Depends on Phase 2-1 (`joinRoom`, Pusher auth), Phase 2-2 (room validation)
- Files: `src/app/play/[code]/lobby/page.tsx`, `src/components/room/LobbyView.tsx`, `src/app/api/rooms/[code]/chat/route.ts`
- สร้าง `new PusherJs(...)` ใน component แทน singleton เพราะต้องการ `auth.params.playerId` ต่างกันแต่ละ player
- `storageKey = lobby-{roomCode}` ใน sessionStorage — reload แล้ว reconnect ได้โดยไม่กรอกชื่อใหม่
- filter `members` ด้วย `isHost` เพื่อแสดงเฉพาะ players ใน list
- Chat API verify player ผ่าน DB ก่อน trigger Pusher

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
