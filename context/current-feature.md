# Current Feature: Phase 1-5 — Edit Quiz Page

## Status

In Progress

## Goals

- `/quiz/[id]` โหลดได้ แสดง title, description, และ questions
- 404 ถ้า quiz set ไม่ใช่ของ host ที่ login อยู่
- แก้ title/description แล้วกด "Save Changes" — อัปเดตสำเร็จ
- ปุ่ม "Save Changes" disabled เมื่อ form ไม่มีการแก้ไข (`!isDirty`)
- กด "+ Add Question" → QuestionEditor ปรากฏด้านล่าง
- เพิ่ม question ใหม่ — ปรากฏใน list
- กด "Edit" บน question → QuestionEditor เปิดพร้อม pre-fill ข้อมูลเดิม
- แก้ question แล้วบันทึก — list อัปเดต
- กด "Delete" บน question — ลบออกจาก list
- ไม่สามารถเปิด editor 2 อันพร้อมกัน (ปุ่ม disabled ขณะมี editor เปิดอยู่)
- `npm run build` ผ่าน

## Notes

- Route: `/quiz/[id]` — Server Component fetch + auth, Client Component handle interaction
- Depends on Phase 1-2 (`updateQuizSet`, `upsertQuestion`, `deleteQuestion`)
- Files: `src/app/(dashboard)/quiz/[id]/page.tsx`, `src/components/quiz/QuizEditor.tsx`, `src/components/quiz/QuestionEditor.tsx`
- `useFieldArray` ใช้ `{ value: string }` object แทน string เปล่าเพราะ RHF ต้องการ object ใน array
- `params` ใน Next.js 15+ ต้อง `await params`
- `editingId !== null` disable ปุ่ม Edit/Add ทั้งหมดขณะมี editor เปิดอยู่

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Phase 0 — Foundation: installed all dependencies (Prisma v7/Neon, Clerk, Pusher, shadcn/ui, Zod, React Hook Form), configured middleware/auth pages, schema + migration, Pusher clients, Inter font, shared types
- Phase 1-1 — Clerk User Sync: สร้าง webhook route `/api/webhooks/clerk` ใช้ `verifyWebhook` จาก `@clerk/nextjs/webhooks` (Clerk v7), สร้าง `User` ใน DB เมื่อ `user.created` ยิงมา, ทดสอบผ่าน ngrok + Google sign-up สำเร็จ
- Phase 1-2 — Quiz Server Actions: สร้าง `src/actions/quiz.ts` พร้อม 5 actions (`createQuizSet`, `updateQuizSet`, `deleteQuizSet`, `upsertQuestion`, `deleteQuestion`) auth-gated, ownership check, try/catch ครบ, return `{ success, data, error }` pattern
- Phase 1-3 — Dashboard Page: สร้าง `(dashboard)` layout + `/dashboard` page แสดง quiz sets ของ host พร้อม empty state, Edit/Delete actions และ `QuizCard` component
- Phase 1-4 — Create Quiz Page: สร้างหน้า `/quiz/new` พร้อม React Hook Form + Zod validation, submit → `createQuizSet` → redirect `/quiz/[id]`, error แสดง alert
