# Phase 2-2 — Play Entry Page

## Status

Not Started

## Goals

หน้ากรอกรหัสห้องสำหรับ player — validate ว่าห้องมีอยู่จริงและยัง LOBBY อยู่
ก่อน redirect ไปที่ `/play/[code]/lobby`

**Route:** `/play`
**Depends on:** Phase 2-1 (`joinRoom` action, Room ใน DB)

---

## Files to Create

| File | Action |
|---|---|
| `src/app/play/page.tsx` | Create |

---

## Tasks

### สร้าง Play Entry Page

**`src/app/play/page.tsx`:**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PlayPage() {
  const router = useRouter()
  const [code, setCode]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setLoading(true)
    setError('')

    const res = await fetch(`/api/rooms/${trimmed}`)
    if (!res.ok) {
      setError('Room not found or game already started')
      setLoading(false)
      return
    }

    router.push(`/play/${trimmed}/lobby`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">QuickQuiz</h1>
          <p className="text-muted-foreground mt-1">Enter a room code to join</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="code">Room Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. XQZT7"
              maxLength={10}
              autoComplete="off"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
            {loading ? 'Checking...' : 'Join Room'}
          </Button>
        </form>
      </div>
    </main>
  )
}
```

---

### สร้าง Room Lookup API Route

**`src/app/api/rooms/[code]/route.ts`:**

```ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const room = await prisma.room.findUnique({
    where:   { code },
    select:  { code: true, status: true },
  })

  if (!room || room.status !== 'LOBBY') {
    return NextResponse.json({ error: 'Room not found or unavailable' }, { status: 404 })
  }

  return NextResponse.json({ code: room.code, status: room.status })
}
```

---

## Checklist

- [ ] `/play` โหลดได้ ไม่มี error
- [ ] กรอก code แล้วกด Join → validate ผ่าน API
- [ ] Code ไม่มีในระบบ → แสดง error "Room not found or game already started"
- [ ] Room status ไม่ใช่ LOBBY → แสดง error เดียวกัน
- [ ] Code ถูกต้อง → redirect ไป `/play/[code]/lobby`
- [ ] Input force uppercase ขณะพิมพ์
- [ ] `npm run build` ผ่าน

## Notes

- ใช้ fetch ตรงแทน Server Action เพราะต้องการ HTTP status code ในการ validate
- `select: { code, status }` — ไม่เปิดเผยข้อมูล room อื่นให้ guest
- Input `toUpperCase()` ทันทีขณะพิมพ์ เพื่อ UX ที่ดี (ไม่ต้อง shift)

