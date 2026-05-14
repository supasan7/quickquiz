# Phase 2-4 — Host Room View

## Status

Not Started

## Goals

หน้าควบคุมห้องสำหรับ host — เห็นรายชื่อผู้เล่น, อ่านแชท real-time, กด "Start Game"
เมื่อกด Start → ทุก player ใน lobby redirect ไป `/play/[code]/game`

**Route:** `/room/[code]`
**Depends on:** Phase 2-1 (`startGame` action, Pusher auth), Phase 2-3 (presence channel)

---

## Files to Create

| File | Action |
|---|---|
| `src/app/room/[code]/page.tsx` | Create |
| `src/components/room/HostRoomView.tsx` | Create |

---

## Tasks

### 1. Host Room Page (Server Component)

**`src/app/room/[code]/page.tsx`:**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import HostRoomView from '@/components/room/HostRoomView'

export default async function HostRoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/sign-in')

  const room = await prisma.room.findUnique({
    where:   { code },
    include: { quizSet: true },
  })

  if (!room || room.quizSet.hostId !== user.id) notFound()
  if (room.status !== 'LOBBY') redirect('/dashboard')

  return <HostRoomView roomCode={code} hostName={user.name} />
}
```

---

### 2. HostRoomView Client Component

**`src/components/room/HostRoomView.tsx`:**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PusherJs from 'pusher-js'
import { Button } from '@/components/ui/button'
import { startGame } from '@/actions/room'

type Member = { id: string; info: { name: string; isHost: boolean } }
type ChatMessage = { senderId: string; senderName: string; text: string }

type Props = {
  roomCode: string
  hostName: string
}

export default function HostRoomView({ roomCode, hostName }: Props) {
  const router = useRouter()
  const [members,   setMembers]   = useState<Member[]>([])
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [starting,  setStarting]  = useState(false)

  // Connect to presence channel as host (Clerk session used in Pusher auth)
  useEffect(() => {
    const pusher = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster:      process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    })

    const channel = pusher.subscribe(`presence-room-${roomCode}`) as any

    channel.bind('pusher:subscription_succeeded', (data: { members: Record<string, { name: string; isHost: boolean }> }) => {
      const list = Object.entries(data.members).map(([id, info]) => ({ id, info }))
      setMembers(list)
    })

    channel.bind('pusher:member_added', (member: Member) => {
      setMembers((prev) => [...prev, member])
    })

    channel.bind('pusher:member_removed', (member: Member) => {
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
    })

    channel.bind('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
    })

    return () => {
      pusher.unsubscribe(`presence-room-${roomCode}`)
      pusher.disconnect()
    }
  }, [roomCode])

  async function handleStartGame() {
    setStarting(true)
    const result = await startGame(roomCode)
    if (!result.success) {
      alert(result.error)
      setStarting(false)
      return
    }
    router.push(`/room/${roomCode}/game`)
  }

  const players = members.filter((m) => !m.info.isHost)

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Room Code</p>
          <h1 className="text-3xl font-bold tracking-widest">{roomCode}</h1>
        </div>
        <Button onClick={handleStartGame} disabled={starting || players.length === 0}>
          {starting ? 'Starting…' : 'Start Game'}
        </Button>
      </div>

      {players.length === 0 && (
        <p className="text-muted-foreground text-center py-8">Waiting for players to join…</p>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Player list */}
        <section className="space-y-2">
          <h2 className="font-semibold">Players ({players.length})</h2>
          <ul className="space-y-1">
            {players.map((m) => (
              <li key={m.id} className="text-sm px-3 py-2 border rounded-lg">
                {m.info.name}
              </li>
            ))}
          </ul>
        </section>

        {/* Chat (read-only) */}
        <section className="space-y-2">
          <h2 className="font-semibold">Chat</h2>
          <div className="border rounded-lg p-3 h-48 overflow-y-auto space-y-1">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages yet</p>
            )}
            {messages.map((msg, i) => (
              <p key={i} className="text-sm">
                <span className="font-medium">{msg.senderName}:</span> {msg.text}
              </p>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
```

---

### 3. Add "Host Game" Button to Quiz Editor

แก้ `src/app/(dashboard)/quiz/[id]/page.tsx` เพิ่มปุ่ม "Host Game" ที่เรียก `createRoom` แล้ว redirect:

```tsx
// เพิ่มใน QuizEditor หรือสร้าง HostGameButton component แยก
'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createRoom } from '@/actions/room'

export default function HostGameButton({ quizSetId }: { quizSetId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleHost() {
    setLoading(true)
    const result = await createRoom(quizSetId)
    if (result.success) {
      router.push(`/room/${result.data.code}`)
    } else {
      alert(result.error)
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleHost} disabled={loading}>
      {loading ? 'Creating…' : '▶ Host Game'}
    </Button>
  )
}
```

> เพิ่ม `<HostGameButton quizSetId={quizSet.id} />` ใน `QuizEditor.tsx` (บน section หรือใน header) หรือใน `QuizCard.tsx`

---

## Checklist

- [ ] `/room/[code]` โหลดได้ ไม่มี error (requires host auth)
- [ ] 404 ถ้า room ไม่ใช่ของ host ที่ login
- [ ] Redirect ไป `/dashboard` ถ้า room ไม่ใช่ LOBBY แล้ว
- [ ] เห็น player list update real-time
- [ ] เห็น chat messages จาก players
- [ ] "Start Game" disabled เมื่อยังไม่มี player
- [ ] กด "Start Game" → players ใน lobby redirect ไป `/play/[code]/game`
- [ ] ปุ่ม "Host Game" ใน QuizEditor/QuizCard → สร้าง room → ไปที่ `/room/[code]`
- [ ] `npm run build` ผ่าน

## Notes

- Host ไม่ส่ง `playerId` ใน Pusher auth — ใช้ Clerk session แทน (Phase 2-1 auth route รองรับแล้ว)
- `router.push('/room/${roomCode}/game')` ใน host view — route นี้จะสร้างใน Phase 3
- "Start Game" disabled ถ้า `players.length === 0` — ป้องกัน host start เกมโดยไม่มี player
- `HostGameButton` เป็น Client Component แยกเพื่อไม่ให้ `QuizEditor` (ที่เป็น `'use client'` อยู่แล้ว) ใหญ่เกินไป — สามารถ inline ได้ถ้าต้องการ
