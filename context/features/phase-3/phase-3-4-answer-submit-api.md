# Phase 3-4 — Answer Submit API Route

## Status

Not Started

## Goals

`submitAnswer` ใน Phase 3-1 เป็น Server Action ที่เรียกจาก client — แต่ตรงนี้มีปัญหา:
Server Action ต้องการ `'use server'` context และเรียกจาก `'use client'` component ได้
แต่ใช้ `auth()` จาก Clerk สำหรับ host เท่านั้น — player ไม่มี Clerk session

ดังนั้น `submitAnswer` ต้องไม่เรียก `auth()` (แล้วก็ไม่ได้เรียกจริงในตอนนี้)
แต่เพื่อความชัดเจน สร้าง dedicated API route สำหรับ player submit answer แทน Server Action

**Depends on:** Phase 3-1 (game logic)

---

## Files to Create

| File | Action |
|---|---|
| `src/app/api/rooms/[code]/answer/route.ts` | Create |

---

## Tasks

### Answer Submit API Route

**`src/app/api/rooms/[code]/answer/route.ts`:**

```ts
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const { playerId, choiceIndex } = await req.json()

  if (typeof playerId !== 'string' || typeof choiceIndex !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const room = await prisma.room.findUnique({
    where:   { code },
    include: { quizSet: { include: { questions: { orderBy: { order: 'asc' } } } } },
  })

  if (!room || room.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Game not active' }, { status: 400 })
  }

  const player = await prisma.player.findFirst({ where: { id: playerId, roomId: room.id } })
  if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const question = room.quizSet.questions[room.currentQ]
  if (!question) return NextResponse.json({ error: 'No active question' }, { status: 400 })

  const isCorrect = choiceIndex === question.correctIndex
  if (isCorrect) {
    await prisma.player.update({
      where: { id: playerId },
      data:  { score: { increment: 1000 } },
    })
  }

  await pusher.trigger(`room-${code}`, 'answer-submitted', { choiceIndex })

  return NextResponse.json({ ok: true })
}
```

### Update PlayerGameView to use API route

แก้ `handleAnswer` ใน `PlayerGameView.tsx` ให้ใช้ fetch แทน Server Action:

```ts
async function handleAnswer(choiceIndex: number) {
  if (!identity) return
  if (state.phase !== 'question') return

  setState({ phase: 'answered', question: state.question, myChoice: choiceIndex })
  if (timerRef.current) clearInterval(timerRef.current)

  await fetch(`/api/rooms/${roomCode}/answer`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ playerId: identity.playerId, choiceIndex }),
  })
}
```

> และลบ `import { submitAnswer } from '@/actions/game'` ออกจาก `PlayerGameView.tsx`

---

## Checklist

- [ ] `POST /api/rooms/[code]/answer` ทำงานได้
- [ ] Player ที่ไม่ได้อยู่ใน room → 403
- [ ] Room ไม่ใช่ ACTIVE → 400
- [ ] คำตอบถูก → `Player.score` เพิ่ม 1000
- [ ] Broadcast `answer-submitted` ทุกครั้ง
- [ ] `PlayerGameView` ใช้ fetch แทน Server Action
- [ ] `npm run build` ผ่าน

## Notes

- Server Action กับ guest player มีปัญหาเรื่อง auth context — API route ชัดเจนกว่า
- Pattern เดียวกับ chat route (Phase 2-3) ที่ verify player ผ่าน DB
- `submitAnswer` ใน `game.ts` ยังคงอยู่ได้สำหรับ reference แต่ไม่ถูกเรียกจาก player client
