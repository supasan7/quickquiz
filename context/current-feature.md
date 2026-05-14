# Current Feature: Phase 1-1 — Clerk User Sync

## Status

Complete

## Goals

- เมื่อ user สมัคร Clerk ครั้งแรก ให้ sync ข้อมูลมาสร้าง `User` record ใน DB อัตโนมัติผ่าน webhook
- Webhook route ที่ `/api/webhooks/clerk` verify signature และสร้าง `User` ใน DB
- `CLERK_WEBHOOK_SIGNING_SECRET` ตั้งค่าใน `.env.local` และ Clerk Dashboard
- `npm run build` ผ่าน ไม่มี error

## Notes

- ใช้ `verifyWebhook` จาก `@clerk/nextjs/webhooks` (Clerk v7) — ไม่ต้องติดตั้ง `svix` แยก, bundled อยู่แล้ว
- `verifyWebhook` อ่านค่าจาก env `CLERK_WEBHOOK_SIGNING_SECRET` (ไม่ใช่ `CLERK_WEBHOOK_SECRET`)
- Webhook ไม่ยิงใน local dev เว้นแต่ expose port ออก internet (ngrok / localtunnel)
- สามารถ skip การทดสอบ webhook จริงได้ โดยสร้าง `User` ใน DB manually ผ่าน `npx prisma studio`
- ยังไม่ handle `user.updated` / `user.deleted` ใน phase นี้
- Spec เต็ม: `context/features/phase-1-1-clerk-user-sync.md`

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Phase 0 — Foundation: installed all dependencies (Prisma v7/Neon, Clerk, Pusher, shadcn/ui, Zod, React Hook Form), configured middleware/auth pages, schema + migration, Pusher clients, Inter font, shared types
- Phase 1-1 — Clerk User Sync: สร้าง webhook route `/api/webhooks/clerk` ใช้ `verifyWebhook` จาก `@clerk/nextjs/webhooks` (Clerk v7), สร้าง `User` ใน DB เมื่อ `user.created` ยิงมา, ทดสอบผ่าน ngrok + Google sign-up สำเร็จ
