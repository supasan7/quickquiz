# Phase 0 — Foundation

## Status

Not Started

## Goals

ตั้งค่า infrastructure ทั้งหมดที่ Phase 1–3 ต้องใช้ ไม่มี UI ใหม่ในขั้นตอนนี้

---

## Tasks

### 1. Install Dependencies

```bash
# UI
npx shadcn@latest init

# Database
npm install prisma @prisma/client @neondatabase/serverless

# Auth
npm install @clerk/nextjs

# Real-time
npm install pusher pusher-js

# Validation & Forms
npm install zod react-hook-form @hookform/resolvers
```

---

### 2. Environment Variables

สร้างไฟล์ `.env.local` ที่ root:

```env
# Neon PostgreSQL
DATABASE_URL=postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Pusher
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
```

> เพิ่ม `.env.local` ใน `.gitignore` (Next.js ทำให้อัตโนมัติ)

---

### 3. Clerk Setup

**ติดตั้ง middleware** — สร้างไฟล์ `src/middleware.ts`:

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/quiz(.*)',
  '/room(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

**สร้างหน้า auth** — สร้างไฟล์:
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

```ts
// sign-in/page.tsx
import { SignIn } from '@clerk/nextjs'
export default function Page() {
  return <SignIn />
}
```

```ts
// sign-up/page.tsx
import { SignUp } from '@clerk/nextjs'
export default function Page() {
  return <SignUp />
}
```

**Wrap layout** — แก้ `src/app/layout.tsx`:

```ts
import { ClerkProvider } from '@clerk/nextjs'
// ...
export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

---

### 4. Prisma + Neon Setup

**Init Prisma:**

```bash
npx prisma init --datasource-provider postgresql
```

**แก้ `prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  clerkId   String    @unique
  name      String
  email     String    @unique
  quizSets  QuizSet[]
  createdAt DateTime  @default(now())
}

model QuizSet {
  id          String     @id @default(cuid())
  title       String
  description String?
  hostId      String
  host        User       @relation(fields: [hostId], references: [id], onDelete: Cascade)
  questions   Question[]
  rooms       Room[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Question {
  id            String   @id @default(cuid())
  quizSetId     String
  quizSet       QuizSet  @relation(fields: [quizSetId], references: [id], onDelete: Cascade)
  text          String
  choices       String[]
  correctIndex  Int
  timeLimitSecs Int      @default(20)
  order         Int
}

model Room {
  id        String     @id @default(cuid())
  code      String     @unique
  quizSetId String
  quizSet   QuizSet    @relation(fields: [quizSetId], references: [id])
  status    RoomStatus @default(LOBBY)
  currentQ  Int        @default(0)
  players   Player[]
  createdAt DateTime   @default(now())
}

model Player {
  id     String @id @default(cuid())
  roomId String
  room   Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)
  name   String
  score  Int    @default(0)
}

enum RoomStatus {
  LOBBY
  ACTIVE
  FINISHED
}
```

**รัน migration:**

```bash
npx prisma migrate dev --name init
```

**สร้าง Prisma client singleton** — `src/lib/prisma.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

### 5. Pusher Setup

**สร้าง Pusher server client** — `src/lib/pusher.ts`:

```ts
import Pusher from 'pusher'

export const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_APP_KEY!,
  secret:  process.env.PUSHER_APP_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS:  true,
})
```

**สร้าง Pusher browser client** — `src/lib/pusher-client.ts`:

```ts
import PusherJs from 'pusher-js'

export const pusherClient = new PusherJs(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
)
```

**สร้าง Pusher auth route** — `src/app/api/pusher/auth/route.ts`:

```ts
import { pusher } from '@/lib/pusher'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')!
  const channel  = params.get('channel_name')!

  const authResponse = pusher.authorizeChannel(socketId, channel)
  return NextResponse.json(authResponse)
}
```

---

### 6. Setup Font (Inter via next/font)

แก้ `src/app/layout.tsx`:

```ts
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="th" className={inter.variable}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

---

### 7. Type Definitions

**`src/types/quiz.ts`:**

```ts
export type QuizSet = {
  id:          string
  title:       string
  description: string | null
  questions:   Question[]
  createdAt:   Date
}

export type Question = {
  id:            string
  text:          string
  choices:       string[]
  correctIndex:  number
  timeLimitSecs: number
  order:         number
}
```

**`src/types/room.ts`:**

```ts
export type Room = {
  id:       string
  code:     string
  status:   'LOBBY' | 'ACTIVE' | 'FINISHED'
  currentQ: number
}

export type Player = {
  id:    string
  name:  string
  score: number
}

export type ChatMessage = {
  playerId:  string
  playerName: string
  text:      string
  sentAt:    number
}
```

---

### 8. Verify Setup

```bash
# build ต้องผ่าน
npm run build

# ตรวจ migration status
npx prisma migrate status

# ดู schema ใน Neon dashboard หรือ
npx prisma studio
```

---

## Checklist

- [ ] `npm install` ทุก package สำเร็จ
- [ ] `.env.local` ครบทุก key
- [ ] Clerk middleware ใช้งานได้ (route `/dashboard` redirect ไป sign-in)
- [ ] Prisma migrate สำเร็จ — ตาราง 5 ตารางอยู่ใน Neon
- [ ] `src/lib/prisma.ts` import ได้
- [ ] `src/lib/pusher.ts` และ `pusher-client.ts` import ได้
- [ ] Inter font โหลดผ่าน CSS variable `--font-inter`
- [ ] `npm run build` ผ่าน ไม่มี error

## Notes

- Prisma ใช้ `String[]` สำหรับ `choices` แทน `Json` เพื่อ type safety ที่ดีกว่า
- Pusher auth route ไม่ตรวจ session ตอนนี้ — Phase 2 ค่อยเพิ่ม validation
- ไม่ต้องสร้าง `User` record ใน DB จนกว่า Phase 1 จะต้องการ (Clerk webhook)
