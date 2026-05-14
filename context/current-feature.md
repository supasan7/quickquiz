# Current Feature: Phase 1-4 — Create Quiz Page

## Status

In Progress

## Goals

- `/quiz/new` โหลดได้ ไม่มี error
- Submit ด้วย title ว่าง → แสดง validation error
- Submit สำเร็จ → redirect ไปที่ `/quiz/[id]` ของ quiz set ใหม่
- ปุ่ม Cancel → กลับหน้าก่อนหน้า
- ปุ่ม "← Back to Dashboard" → ไปที่ `/dashboard`
- `npm run build` ผ่าน

## Notes

- Route: `/quiz/new` — ใช้ `'use client'` เพราะต้องการ `useRouter`
- Depends on Phase 1-2 (`createQuizSet` action)
- File เดียว: `src/app/(dashboard)/quiz/new/page.tsx`
- ส่ง data ผ่าน `FormData` เพื่อ match signature ของ `createQuizSet`
- shadcn components ที่ต้องใช้: `Input`, `Textarea`, `Label` (ต้องเช็คว่าติดตั้งแล้วหรือยัง)

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Phase 0 — Foundation: installed all dependencies (Prisma v7/Neon, Clerk, Pusher, shadcn/ui, Zod, React Hook Form), configured middleware/auth pages, schema + migration, Pusher clients, Inter font, shared types
- Phase 1-1 — Clerk User Sync: สร้าง webhook route `/api/webhooks/clerk` ใช้ `verifyWebhook` จาก `@clerk/nextjs/webhooks` (Clerk v7), สร้าง `User` ใน DB เมื่อ `user.created` ยิงมา, ทดสอบผ่าน ngrok + Google sign-up สำเร็จ
- Phase 1-2 — Quiz Server Actions: สร้าง `src/actions/quiz.ts` พร้อม 5 actions (`createQuizSet`, `updateQuizSet`, `deleteQuizSet`, `upsertQuestion`, `deleteQuestion`) auth-gated, ownership check, try/catch ครบ, return `{ success, data, error }` pattern
- Phase 1-3 — Dashboard Page: สร้าง `(dashboard)` layout + `/dashboard` page แสดง quiz sets ของ host พร้อม empty state, Edit/Delete actions และ `QuizCard` component
