# Current Feature: Phase 3-1 — Game Server Actions

## Status

In Progress

## Goals

- `revealQuestion(roomCode)` broadcast `question-revealed` (ไม่มี correctIndex)
- `submitAnswer(roomCode, playerId, choiceIndex)` อัปเดต score + broadcast `answer-submitted`
- `revealResult(roomCode)` broadcast `round-result` พร้อม correctIndex + player scores
- `nextQuestion(roomCode)` ไปข้อถัดไป หรือ broadcast `leaderboard` ถ้าหมดแล้ว
- `endGame(roomCode)` update status + broadcast `end-game`
- `npm run build` ผ่าน

## Notes

- Depends on Phase 2-1 (room actions), Phase 1-2 (quiz/question data)
- File เดียว: `src/actions/game.ts`
- Score = 1000 points per correct answer (flat)
- `answer-submitted` broadcast แค่ `choiceIndex` ไม่มี playerId
- `assertHostOwnsRoom` ตรวจ ownership + status === ACTIVE
- `endGame` มี separate auth check เพราะ `assertHostOwnsRoom` ต้องการ ACTIVE แต่ endGame เรียกหลัง leaderboard ได้

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
