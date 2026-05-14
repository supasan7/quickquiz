# Phase 1-1 — Clerk User Sync

## Status

Not Started

## Goals

เมื่อ user สมัคร Clerk ครั้งแรก ให้ sync ข้อมูลมาสร้าง `User` record ใน DB อัตโนมัติผ่าน webhook
ถ้าไม่มี `User` ใน DB, Server Actions ใน Phase 1-2 จะ fail ทั้งหมด

---

## Files to Create / Edit

| File | Action |
|---|---|
| `src/app/api/webhooks/clerk/route.ts` | Create |
| `.env.local` | Edit — เพิ่ม `CLERK_WEBHOOK_SECRET` |

---

## Tasks

### 1. ติดตั้ง svix

```bash
npm install svix
```

---

### 2. เพิ่ม Environment Variable

ใน `.env.local`:

```env
CLERK_WEBHOOK_SECRET=whsec_xxx
```

> ได้ค่านี้จาก Clerk Dashboard → Webhooks → signing secret

---

### 3. สร้าง Webhook Route

**`src/app/api/webhooks/clerk/route.ts`:**

```ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!SIGNING_SECRET) return new Response('Missing secret', { status: 500 })

  const wh = new Webhook(SIGNING_SECRET)
  const headerPayload = await headers()
  const svixId        = headerPayload.get('svix-id')!
  const svixTimestamp = headerPayload.get('svix-timestamp')!
  const svixSignature = headerPayload.get('svix-signature')!

  let evt: WebhookEvent
  try {
    evt = wh.verify(await req.text(), {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    await prisma.user.create({
      data: {
        clerkId: id,
        email:   email_addresses[0].email_address,
        name:    `${first_name ?? ''} ${last_name ?? ''}`.trim() || 'User',
      },
    })
  }

  return new Response('OK', { status: 200 })
}
```

---

### 4. ตั้งค่า Clerk Webhook

ใน [Clerk Dashboard](https://dashboard.clerk.com):
1. ไปที่ **Webhooks** → **Add Endpoint**
2. URL: `https://your-domain.com/api/webhooks/clerk`
3. Events: เลือก `user.created`
4. Copy **Signing Secret** → วางใน `.env.local`

> สำหรับ local dev ใช้ [ngrok](https://ngrok.com) หรือ `npx localtunnel` expose port 3000 ก่อน

---

## Checklist

- [ ] `npm install svix` สำเร็จ
- [ ] `CLERK_WEBHOOK_SECRET` อยู่ใน `.env.local`
- [ ] Webhook endpoint ตั้งค่าใน Clerk Dashboard แล้ว
- [ ] สมัคร Clerk account ใหม่ → มี `User` record ปรากฏใน DB (ตรวจด้วย `npx prisma studio`)
- [ ] `npm run build` ผ่าน

## Notes

- Webhook ไม่ได้ยิงตอน dev local เว้นแต่ expose port ออก internet
- ถ้าต้องการ test local ให้สร้าง user ใน DB manually ผ่าน `npx prisma studio` เพื่อทดสอบ Phase 1-2 ต่อได้เลย
- ยังไม่ handle `user.updated` / `user.deleted` — เพิ่มเมื่อต้องการ
