# Current Feature: Phase 1-3 — Dashboard Page

## Status

In Progress

## Goals

- แสดง list ของ quiz sets ทั้งหมดของ host พร้อมจำนวน questions และ updatedAt
- Empty state เมื่อยังไม่มี quiz set
- ปุ่ม "+ New Quiz" → `/quiz/new`
- ปุ่ม "Edit" → `/quiz/[id]`
- ปุ่ม "Delete" → ลบ quiz set + revalidate
- Redirect ไป `/sign-in` ถ้าไม่ได้ login
- `UserButton` แสดงใน header
- `npm run build` ผ่าน

## Notes

- Route: `/dashboard` — requires auth
- Depends on Phase 1-1 (User in DB) และ Phase 1-2 (deleteQuizSet action)
- Files: `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, `src/components/quiz/QuizCard.tsx`
- Dashboard fetch ตรงจาก Prisma ใน Server Component — ไม่ผ่าน API route
- `select: { id: true }` ใน questions query ลด payload — ต้องการแค่จำนวน
- `orderBy: { updatedAt: 'desc' }` ให้ quiz ที่แก้ล่าสุดอยู่บนสุด

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Phase 0 — Foundation: installed all dependencies (Prisma v7/Neon, Clerk, Pusher, shadcn/ui, Zod, React Hook Form), configured middleware/auth pages, schema + migration, Pusher clients, Inter font, shared types
- Phase 1-1 — Clerk User Sync: สร้าง webhook route `/api/webhooks/clerk` ใช้ `verifyWebhook` จาก `@clerk/nextjs/webhooks` (Clerk v7), สร้าง `User` ใน DB เมื่อ `user.created` ยิงมา, ทดสอบผ่าน ngrok + Google sign-up สำเร็จ
- Phase 1-2 — Quiz Server Actions: สร้าง `src/actions/quiz.ts` พร้อม 5 actions (`createQuizSet`, `updateQuizSet`, `deleteQuizSet`, `upsertQuestion`, `deleteQuestion`) auth-gated, ownership check, try/catch ครบ, return `{ success, data, error }` pattern
