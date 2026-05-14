# Phase 2-3 — Player Lobby

## Status

Not Started

## Goals

หน้า lobby สำหรับ player — กรอกชื่อ, เห็นรายชื่อผู้เล่นแบบ real-time, แชทได้
เมื่อ host กด Start → redirect ไป `/play/[code]/game`

**Route:** `/play/[code]/lobby`
**Depends on:** Phase 2-1 (`joinRoom`, Pusher auth), Phase 2-2 (room validation)

---

## Files to Create

| File | Action |
|---|---|
| `src/app/play/[code]/lobby/page.tsx` | Create |
| `src/components/room/LobbyView.tsx` | Create |
| `src/app/api/rooms/[code]/chat/route.ts` | Create |

---

## Tasks

### 1. Lobby Page (Server Component)

**`src/app/play/[code]/lobby/page.tsx`:**

```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import LobbyView from '@/components/room/LobbyView'

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const room = await prisma.room.findUnique({
    where:  { code },
    select: { code: true, status: true },
  })

  if (!room || room.status !== 'LOBBY') notFound()

  return <LobbyView roomCode={code} />
}
```

---

### 2. LobbyView Client Component

**`src/components/room/LobbyView.tsx`:**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PusherJs from 'pusher-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinRoom } from '@/actions/room'

type Member = { id: string; info: { name: string; isHost: boolean } }
type ChatMessage = { senderId: string; senderName: string; text: string }

type Props = { roomCode: string }

export default function LobbyView({ roomCode }: Props) {
  const router = useRouter()

  // ─── Guest identity (persisted in sessionStorage per room) ───
  const storageKey  = `lobby-${roomCode}`
  const [playerId,   setPlayerId]   = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [nameInput,  setNameInput]  = useState('')
  const [joining,    setJoining]    = useState(false)
  const [joinError,  setJoinError]  = useState('')

  // ─── Lobby state ──────────────────────────────────────────────
  const [members,  setMembers]  = useState<Member[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Restore identity from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const { playerId: pid, playerName: pname } = JSON.parse(stored)
      setPlayerId(pid)
      setPlayerName(pname)
    }
  }, [storageKey])

  // Connect to Pusher once playerId is known
  useEffect(() => {
    if (!playerId) return

    const pusher = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster:      process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth:         { params: { playerId } },
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

    channel.bind('game-start', () => {
      router.push(`/play/${roomCode}/game`)
    })

    return () => {
      pusher.unsubscribe(`presence-room-${roomCode}`)
      pusher.disconnect()
    }
  }, [playerId, roomCode, router])

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Join handler ─────────────────────────────────────────────
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const name = nameInput.trim()
    if (!name) return
    setJoining(true)
    setJoinError('')

    const result = await joinRoom(roomCode, name)
    if (!result.success) {
      setJoinError(result.error)
      setJoining(false)
      return
    }

    const { playerId: pid, playerName: pname } = result.data
    sessionStorage.setItem(storageKey, JSON.stringify({ playerId: pid, playerName: pname }))
    setPlayerId(pid)
    setPlayerName(pname)
    setJoining(false)
  }

  // ─── Chat handler ─────────────────────────────────────────────
  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    const text = chatText.trim()
    if (!text || !playerId || !playerName) return
    setChatText('')

    await fetch(`/api/rooms/${roomCode}/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ playerId, playerName, text }),
    })
  }

  // ─── Name entry screen ────────────────────────────────────────
  if (!playerId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Room</p>
            <h1 className="text-3xl font-bold tracking-widest">{roomCode}</h1>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                maxLength={30}
                autoFocus
              />
              {joinError && <p className="text-sm text-destructive">{joinError}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={joining || !nameInput.trim()}>
              {joining ? 'Joining...' : 'Join Game'}
            </Button>
          </form>
        </div>
      </main>
    )
  }

  // ─── Lobby screen ─────────────────────────────────────────────
  const players = members.filter((m) => !m.info.isHost)

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Room Code</p>
        <h1 className="text-3xl font-bold tracking-widest">{roomCode}</h1>
        <p className="text-muted-foreground mt-1">Waiting for the host to start…</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Player list */}
        <section className="space-y-2">
          <h2 className="font-semibold">Players ({players.length})</h2>
          <ul className="space-y-1">
            {players.map((m) => (
              <li key={m.id} className="text-sm px-3 py-2 border rounded-lg">
                {m.info.name}
                {m.id === playerId && <span className="text-muted-foreground ml-1">(you)</span>}
              </li>
            ))}
          </ul>
        </section>

        {/* Chat */}
        <section className="flex flex-col space-y-2">
          <h2 className="font-semibold">Chat</h2>
          <div className="flex-1 border rounded-lg p-3 h-48 overflow-y-auto space-y-1">
            {messages.map((msg, i) => (
              <p key={i} className="text-sm">
                <span className="font-medium">{msg.senderName}:</span> {msg.text}
              </p>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendChat} className="flex gap-2">
            <Input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Say something…"
              maxLength={200}
            />
            <Button type="submit" size="sm" disabled={!chatText.trim()}>Send</Button>
          </form>
        </section>
      </div>
    </main>
  )
}
```

---

### 3. Chat API Route

**`src/app/api/rooms/[code]/chat/route.ts`:**

```ts
import { pusher } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const { playerId, playerName, text } = await req.json()

  if (!playerId || !playerName || !text?.trim()) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Verify player belongs to this room
  const player = await prisma.player.findFirst({
    where: { id: playerId, room: { code } },
  })
  if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  await pusher.trigger(`presence-room-${code}`, 'chat-message', {
    senderId:   playerId,
    senderName: playerName,
    text:       text.trim(),
  })

  return NextResponse.json({ ok: true })
}
```

---

## Checklist

- [ ] `/play/[code]/lobby` โหลดได้ ไม่มี error
- [ ] แสดงหน้ากรอกชื่อถ้ายังไม่ได้ join
- [ ] กรอกชื่อ → join สำเร็จ → เห็นหน้า lobby
- [ ] รายชื่อผู้เล่น update real-time เมื่อมีคนเข้า/ออก
- [ ] ส่ง chat message → เห็นในทุก client
- [ ] เมื่อ host กด Start → redirect ไป `/play/[code]/game`
- [ ] ถ้า room ไม่มีหรือไม่ใช่ LOBBY → 404
- [ ] `npm run build` ผ่าน

## Notes

- สร้าง `new PusherJs(...)` ใน `useEffect` ของ component แทน singleton เพราะต้องการ `auth.params.playerId` ที่แตกต่างกันแต่ละ player
- `storageKey = lobby-{roomCode}` ใน sessionStorage ให้ reload หน้าแล้ว reconnect ได้โดยไม่ต้องกรอกชื่อใหม่
- `members` จาก Pusher presence รวม host ด้วย — filter ด้วย `isHost` เพื่อแสดงเฉพาะ players
- Chat API verify player ผ่าน DB (`findFirst` with room code) ก่อน trigger เพื่อป้องกัน unauthorized broadcast
