# Phase 2-1 — Room Server Actions & Pusher Auth

## Status

Not Started

## Goals

สร้าง Server Actions สำหรับ room lifecycle และแก้ Pusher auth ให้รองรับ presence channel

**Depends on:** Phase 1-2 (User/QuizSet in DB)

---

## Files to Create / Update

| File | Action |
|---|---|
| `src/actions/room.ts` | Create |
| `src/app/api/pusher/auth/route.ts` | Update |
| `src/lib/pusher-client.ts` | Update |

---

## Tasks

### 1. Room Server Actions

**`src/actions/room.ts`:**

```ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'

async function getDbUser() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) throw new Error('User not found in DB')
  return user
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

// Host: สร้างห้องจาก quiz set
export async function createRoom(quizSetId: string) {
  try {
    const user = await getDbUser()
    const quizSet = await prisma.quizSet.findUnique({ where: { id: quizSetId } })
    if (!quizSet || quizSet.hostId !== user.id) return { success: false as const, error: 'Forbidden' }

    // หา code ที่ไม่ซ้ำ
    let code: string
    let attempts = 0
    do {
      code = generateCode()
      if (++attempts > 10) return { success: false as const, error: 'Could not generate unique code' }
    } while (await prisma.room.findUnique({ where: { code } }))

    const room = await prisma.room.create({ data: { code, quizSetId } })
    return { success: true as const, data: room }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

// Player: เข้าร่วมห้องในฐานะ guest — สร้าง Player record และ return playerId
export async function joinRoom(roomCode: string, playerName: string) {
  try {
    const room = await prisma.room.findUnique({ where: { code: roomCode } })
    if (!room) return { success: false as const, error: 'Room not found' }
    if (room.status !== 'LOBBY') return { success: false as const, error: 'Game already started' }

    const player = await prisma.player.create({
      data: { roomId: room.id, name: playerName.trim() },
    })
    return { success: true as const, data: { playerId: player.id, playerName: player.name } }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

// Host: เริ่มเกม — อัปเดต status และ broadcast ไปทุก client ในห้อง
export async function startGame(roomCode: string) {
  try {
    const user = await getDbUser()
    const room = await prisma.room.findUnique({
      where:   { code: roomCode },
      include: { quizSet: true },
    })
    if (!room || room.quizSet.hostId !== user.id) return { success: false as const, error: 'Forbidden' }
    if (room.status !== 'LOBBY') return { success: false as const, error: 'Room is not in lobby' }

    await prisma.room.update({ where: { code: roomCode }, data: { status: 'ACTIVE' } })
    await pusher.trigger(`presence-room-${roomCode}`, 'game-start', {})

    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}
```

---

### 2. Update Pusher Auth — รองรับ presence channel พร้อม member data

Pusher presence channel ต้องการ member info (id + name) ใน auth response
แก้ `src/app/api/pusher/auth/route.ts`:

```ts
import { auth } from '@clerk/nextjs/server'
import { pusher } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId   = params.get('socket_id')!
  const channel    = params.get('channel_name')!
  const playerId   = params.get('playerId')

  if (channel.startsWith('presence-')) {
    if (playerId) {
      // Guest player authenticating for lobby presence channel
      const player = await prisma.player.findUnique({ where: { id: playerId } })
      if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

      const authResponse = pusher.authorizeChannel(socketId, channel, {
        user_id:   playerId,
        user_info: { name: player.name, isHost: false },
      })
      return NextResponse.json(authResponse)
    }

    // Host authenticating (Clerk session)
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const authResponse = pusher.authorizeChannel(socketId, channel, {
      user_id:   `host-${user.id}`,
      user_info: { name: user.name, isHost: true },
    })
    return NextResponse.json(authResponse)
  }

  // Private channels (Phase 3+)
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const authResponse = pusher.authorizeChannel(socketId, channel)
  return NextResponse.json(authResponse)
}
```

---

### 3. Update pusher-client.ts — เพิ่ม authEndpoint

```ts
import PusherJs from 'pusher-js'

export const pusherClient = new PusherJs(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster:      process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher/auth',
  }
)
```

> **หมายเหตุ:** สำหรับ lobby (guest player) ต้องสร้าง Pusher instance ใหม่ใน component
> เพื่อส่ง `playerId` ใน `auth.params` — ไม่สามารถใช้ singleton ได้เพราะ playerId แตกต่างกันแต่ละ player
> Pattern ใน component:
> ```ts
> const pusher = new PusherJs(KEY, {
>   cluster: CLUSTER,
>   authEndpoint: '/api/pusher/auth',
>   auth: { params: { playerId } },
> })
> ```

---

## Checklist

- [ ] `createRoom` สร้าง room พร้อม unique code ได้
- [ ] `joinRoom` สร้าง Player record ใน DB และ return playerId
- [ ] `startGame` อัปเดต status เป็น ACTIVE + trigger `game-start` event
- [ ] Pusher auth รองรับ presence channel สำหรับทั้ง guest player และ host
- [ ] `pusher-client.ts` มี `authEndpoint`
- [ ] `npm run build` ผ่าน

## Notes

- `generateCode()` สุ่ม 5 ตัวอักษร uppercase — loop ตรวจ collision สูงสุด 10 ครั้ง
- `joinRoom` ไม่ต้องการ auth — player เป็น guest
- `startGame` ต้องตรวจ ownership ผ่าน `quizSet.hostId`
- Pusher presence auth แยก guest (มี `playerId`) และ host (มี Clerk session) ด้วย `if (playerId)`
- `user_id` ของ host ใช้ prefix `host-` เพื่อป้องกัน collision กับ player id
