# Current Feature: Phase 1-2 — Quiz Server Actions

## Status

In Progress

## Goals

- สร้าง `src/actions/quiz.ts` ที่มี Server Actions ครบสำหรับ CRUD quiz sets และ questions
- ทุก action ต้อง auth-gated (ต้อง sign in) และ verify ownership ก่อน mutation
- Actions: `createQuizSet`, `updateQuizSet`, `deleteQuizSet`, `upsertQuestion`, `deleteQuestion`
- Return `{ success, data, error }` pattern ทุก action
- `npm run build` ผ่านไม่มี errors

## Notes

- Depends on Phase 1-1 (ต้องมี `User` record ใน DB แล้ว)
- ใช้ `getDbUser()` helper lookup user จาก Clerk `userId` → DB `User`
- ใช้ `assertOwnsQuizSet()` ตรวจ ownership ก่อนทุก mutation
- `as const` บน `success` ให้ TypeScript discriminate union ได้ถูกต้อง
- cascade delete ของ questions ทำโดย Prisma schema (`onDelete: Cascade`) ไม่ต้องลบเองใน action

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Phase 0 — Foundation: installed all dependencies (Prisma v7/Neon, Clerk, Pusher, shadcn/ui, Zod, React Hook Form), configured middleware/auth pages, schema + migration, Pusher clients, Inter font, shared types
- Phase 1-1 — Clerk User Sync: สร้าง webhook route `/api/webhooks/clerk` ใช้ `verifyWebhook` จาก `@clerk/nextjs/webhooks` (Clerk v7), สร้าง `User` ใน DB เมื่อ `user.created` ยิงมา, ทดสอบผ่าน ngrok + Google sign-up สำเร็จ
