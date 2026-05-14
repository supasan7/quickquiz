# Current Feature: Phase 2-1 — Room Server Actions & Pusher Auth

## Status

In Progress

## Goals

- `createRoom(quizSetId)` สร้าง room พร้อม unique 5-char code
- `joinRoom(roomCode, playerName)` สร้าง Player record และ return playerId
- `startGame(roomCode)` อัปเดต status เป็น ACTIVE + trigger `game-start` บน presence channel
- Pusher auth รองรับ presence channel สำหรับทั้ง guest player (playerId) และ host (Clerk session)
- `pusher-client.ts` มี `authEndpoint`
- `npm run build` ผ่าน

## Notes

- Depends on Phase 1-2 (User/QuizSet in DB)
- Files: `src/actions/room.ts` (Create), `src/app/api/pusher/auth/route.ts` (Update), `src/lib/pusher-client.ts` (Update)
- `joinRoom` ไม่ต้องการ auth — player เป็น guest
- Pusher presence auth: ถ้ามี `playerId` → guest, ถ้าไม่มี → ใช้ Clerk session (host)
- `user_id` ของ host ใช้ prefix `host-` เพื่อป้องกัน collision กับ player id
- Lobby component ต้องสร้าง `new PusherJs(...)` แยกต่างหากเพื่อส่ง `auth.params.playerId`

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Phase 0 — Foundation: installed all dependencies (Prisma v7/Neon, Clerk, Pusher, shadcn/ui, Zod, React Hook Form), configured middleware/auth pages, schema + migration, Pusher clients, Inter font, shared types
- Phase 1-1 — Clerk User Sync: สร้าง webhook route `/api/webhooks/clerk` ใช้ `verifyWebhook` จาก `@clerk/nextjs/webhooks` (Clerk v7), สร้าง `User` ใน DB เมื่อ `user.created` ยิงมา, ทดสอบผ่าน ngrok + Google sign-up สำเร็จ
- Phase 1-2 — Quiz Server Actions: สร้าง `src/actions/quiz.ts` พร้อม 5 actions (`createQuizSet`, `updateQuizSet`, `deleteQuizSet`, `upsertQuestion`, `deleteQuestion`) auth-gated, ownership check, try/catch ครบ, return `{ success, data, error }` pattern
- Phase 1-3 — Dashboard Page: สร้าง `(dashboard)` layout + `/dashboard` page แสดง quiz sets ของ host พร้อม empty state, Edit/Delete actions และ `QuizCard` component
- Phase 1-4 — Create Quiz Page: สร้างหน้า `/quiz/new` พร้อม React Hook Form + Zod validation, submit → `createQuizSet` → redirect `/quiz/[id]`, error แสดง alert
- Phase 1-5 — Edit Quiz Page: สร้างหน้า `/quiz/[id]` พร้อม `QuizEditor` และ `QuestionEditor`, แก้ title/description, เพิ่ม/แก้ไข/ลบ questions, `router.refresh()` หลัง mutation เพื่อ sync UI
