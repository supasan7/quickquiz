# Phase 3-5 — Landing Page & Avatar

## Status

Not Started

## Goals

หน้าหลัก Gartic Phone-style: เลือก avatar + กรอกชื่อ + กรอก room code → join lobby
Avatar แสดงใน player list ทั้ง lobby (player) และ host view

**Route:** `/` (replaces `/play` as main entry)
**Depends on:** Phase 2-1 (`joinRoom`), Phase 2-3 (LobbyView), Phase 2-4 (HostRoomView)

---

## Files to Create / Update

| File | Action |
|---|---|
| `src/app/page.tsx` | Update — landing page redesign |
| `src/app/play/page.tsx` | Update — redirect ไป `/` |
| `src/app/api/pusher/auth/route.ts` | Update — เพิ่ม avatar ใน member info |
| `src/components/room/LobbyView.tsx` | Update — pass avatar ใน auth, show avatars |
| `src/components/room/HostRoomView.tsx` | Update — show avatars |
| `src/components/quiz/QuizCard.tsx` | Update — เพิ่ม HostGameButton |

---

## Avatar Files

9 SVG files ใน `public/avatar/`:
`bear`, `bird`, `cat`, `dog`, `fish`, `frog`, `octopus`, `owl`, `rabbit`

---

## Tasks

### 1. Landing Page (`src/app/page.tsx`)

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinRoom } from '@/actions/room'

const AVATARS = ['bear', 'bird', 'cat', 'dog', 'fish', 'frog', 'octopus', 'owl', 'rabbit']

export default function HomePage() {
  const router = useRouter()
  const [avatar,   setAvatar]   = useState('cat')
  const [name,     setName]     = useState('')
  const [code,     setCode]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const trimCode = code.trim().toUpperCase()
    const trimName = name.trim()
    if (!trimCode || !trimName) return

    setLoading(true)
    setError('')

    // Validate room exists
    const res = await fetch(`/api/rooms/${trimCode}`)
    if (!res.ok) {
      setError('Room not found or game already started')
      setLoading(false)
      return
    }

    // Join room → get playerId
    const result = await joinRoom(trimCode, trimName)
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    const storageKey = `lobby-${trimCode}`
    sessionStorage.setItem(storageKey, JSON.stringify({
      playerId:   result.data.playerId,
      playerName: result.data.playerName,
      avatar,
    }))

    router.push(`/play/${trimCode}/lobby`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight">QuickQuiz</h1>
          <p className="text-muted-foreground mt-2">Pick your character and join a game</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          {/* Avatar picker */}
          <div className="space-y-2">
            <Label>Choose your character</Label>
            <div className="grid grid-cols-3 gap-3">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={[
                    'rounded-2xl p-3 border-2 transition-all duration-150',
                    'flex items-center justify-center',
                    avatar === a
                      ? 'border-primary bg-primary/20 scale-105'
                      : 'border-border bg-card hover:border-primary/50',
                  ].join(' ')}
                >
                  <Image
                    src={`/avatar/${a}.svg`}
                    alt={a}
                    width={56}
                    height={56}
                    className="w-14 h-14"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              autoComplete="off"
            />
          </div>

          {/* Room code */}
          <div className="space-y-1">
            <Label htmlFor="code">Room Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. XQZT7"
              maxLength={10}
              autoComplete="off"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim() || !code.trim()}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl text-lg
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:brightness-110 active:scale-95 transition-all"
          >
            {loading ? 'Joining…' : '▶ Join Game'}
          </button>
        </form>

        {/* Host link */}
        <p className="text-center text-sm text-muted-foreground">
          Want to host?{' '}
          <Link href="/sign-in" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
```

---

### 2. Redirect `/play` → `/`

```tsx
// src/app/play/page.tsx
import { redirect } from 'next/navigation'

export default function PlayPage() {
  redirect('/')
}
```

---

### 3. Update Pusher Auth — เพิ่ม avatar ใน member info

แก้ `src/app/api/pusher/auth/route.ts` — เพิ่ม `avatar` ใน guest player block:

```ts
const playerId = params.get('playerId')
const avatar   = params.get('avatar') ?? 'cat'   // ← เพิ่ม

// Guest player block:
const authResponse = pusher.authorizeChannel(socketId, channel, {
  user_id:   playerId,
  user_info: { name: player.name, isHost: false, avatar },   // ← เพิ่ม avatar
})
```

---

### 4. Update LobbyView — pass avatar + แสดง avatar

แก้ `src/components/room/LobbyView.tsx`:

**Member type:**
```ts
type Member = { id: string; info: { name: string; isHost: boolean; avatar?: string } }
```

**Pusher auth params — เพิ่ม avatar:**
```ts
const stored   = sessionStorage.getItem(storageKey)
const identity = stored ? JSON.parse(stored) as { playerId: string; playerName: string; avatar: string } : null

// ใน useEffect:
const pusher = new PusherJs(KEY, {
  cluster,
  authEndpoint: '/api/pusher/auth',
  auth: { params: { playerId, avatar: identity?.avatar ?? 'cat' } },  // ← เพิ่ม avatar
})
```

**Player list — แสดง avatar:**
```tsx
{players.map((m) => (
  <li key={m.id} className="flex items-center gap-3 px-3 py-2 border rounded-xl bg-card">
    <img src={`/avatar/${m.info.avatar ?? 'cat'}.svg`} alt="" className="w-8 h-8" />
    <span className="font-semibold text-sm flex-1">{m.info.name}</span>
    {m.id === playerId && <span className="text-muted-foreground text-xs">(you)</span>}
  </li>
))}
```

**Name entry screen — แสดง selected avatar:**
> ไม่ต้องแก้ เพราะ avatar เลือกมาจาก landing page แล้ว (ไม่มี name entry ใน lobby อีกต่อไป)
> แต่ควร handle กรณีที่ยังไม่มี identity ใน sessionStorage (เช่น เข้า URL ตรง) — แสดง avatar picker + name input fallback

---

### 5. Update HostRoomView — แสดง avatar

แก้ `src/components/room/HostRoomView.tsx` — เพิ่ม avatar ใน member type + render:

```ts
type Member = { id: string; info: { name: string; isHost: boolean; avatar?: string } }
```

```tsx
{players.map((m) => (
  <li key={m.id} className="flex items-center gap-3 px-3 py-2 border rounded-xl bg-card">
    <img src={`/avatar/${m.info.avatar ?? 'cat'}.svg`} alt="" className="w-8 h-8" />
    <span className="font-semibold text-sm">{m.info.name}</span>
  </li>
))}
```

---

### 6. Update QuizCard — เพิ่ม HostGameButton

แก้ `src/components/quiz/QuizCard.tsx` — import `HostGameButton` แล้วเพิ่มปุ่ม:

```tsx
import HostGameButton from '@/components/room/HostGameButton'

// ใน CardContent:
<div className="flex gap-2 pt-1">
  <HostGameButton quizSetId={quizSet.id} />
  <Link href={`/quiz/${quizSet.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>Edit</Link>
  <form action={() => { void deleteQuizSet(quizSet.id) }}>
    <Button size="sm" variant="destructive" type="submit">Delete</Button>
  </form>
</div>
```

---

## Checklist

- [ ] `/` แสดง avatar grid + name + code form
- [ ] เลือก avatar → highlight, default `cat`
- [ ] Submit → validate room → joinRoom → sessionStorage เก็บ `{ playerId, playerName, avatar }`
- [ ] Redirect ไป `/play/[code]/lobby`
- [ ] `/play` redirect ไป `/`
- [ ] Pusher auth ส่ง `avatar` ใน `user_info`
- [ ] Lobby player list แสดง avatar image
- [ ] Host lobby player list แสดง avatar image
- [ ] QuizCard มีปุ่ม "▶ Host Game"
- [ ] `npm run build` ผ่าน

## Notes

- `joinRoom` เรียกจาก landing page แทน lobby → lobby page ข้าม name entry ถ้ามี identity ใน sessionStorage
- `LobbyView` ยังคง fallback name entry ไว้สำหรับกรณีเข้า URL ตรง
- avatar เป็น string ชื่อไฟล์ SVG (ไม่มี `.svg` extension) — render เป็น `<img src="/avatar/{avatar}.svg" />`
- ไม่ต้อง Prisma migration — avatar ไม่ได้เก็บใน DB
