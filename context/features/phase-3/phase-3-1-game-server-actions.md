# Phase 3-1 — Game Server Actions

## Status

Not Started

## Goals

สร้าง Server Actions ที่ควบคุม game loop ทั้งหมด
Host ใช้ actions เหล่านี้เพื่อ advance เกม, Players ใช้ submit คำตอบ

**Depends on:** Phase 2-1 (room actions), Phase 1-2 (quiz/question data)

---

## Files to Create

| File | Action |
|---|---|
| `src/actions/game.ts` | Create |

---

## Game Flow

```
startGame() [Phase 2-1]
    ↓ room.status = ACTIVE, broadcast game-start
    ↓ players redirect to /play/[code]/game

revealQuestion(roomCode)             ← host clicks "Reveal Question"
    ↓ broadcast question-revealed (no correctIndex)

submitAnswer(roomCode, playerId, choiceIndex)   ← player taps answer
    ↓ calculate score if correct, update Player.score in DB
    ↓ broadcast answer-submitted { choiceIndex } (for host counts)

revealResult(roomCode)               ← host clicks "Reveal Answer"
    ↓ broadcast round-result { correctIndex, players: [...scores] }

nextQuestion(roomCode)               ← host clicks "Next Question"
    ↓ if more questions: broadcast question-revealed (next question)
    ↓ if last question: broadcast leaderboard { players }

endGame(roomCode)                    ← host clicks "End Game"
    ↓ room.status = FINISHED, broadcast end-game
```

---

## Tasks

### สร้าง `src/actions/game.ts`

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

async function assertHostOwnsRoom(roomCode: string, userId: string) {
  const room = await prisma.room.findUnique({
    where:   { code: roomCode },
    include: { quizSet: { include: { questions: { orderBy: { order: 'asc' } } } } },
  })
  if (!room || room.quizSet.hostId !== userId) throw new Error('Forbidden')
  if (room.status !== 'ACTIVE') throw new Error('Game is not active')
  return room
}

// Host: แสดงคำถามปัจจุบัน (ไม่ส่ง correctIndex)
export async function revealQuestion(roomCode: string) {
  try {
    const user = await getDbUser()
    const room = await assertHostOwnsRoom(roomCode, user.id)
    const question = room.quizSet.questions[room.currentQ]
    if (!question) return { success: false as const, error: 'No more questions' }

    await pusher.trigger(`room-${roomCode}`, 'question-revealed', {
      questionIndex: room.currentQ,
      total:         room.quizSet.questions.length,
      text:          question.text,
      choices:       question.choices,
      timeLimitSecs: question.timeLimitSecs,
    })

    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

// Player: ส่งคำตอบ — อัปเดต score ใน DB แล้ว broadcast count ให้ host
export async function submitAnswer(roomCode: string, playerId: string, choiceIndex: number) {
  try {
    const room = await prisma.room.findUnique({
      where:   { code: roomCode },
      include: { quizSet: { include: { questions: { orderBy: { order: 'asc' } } } } },
    })
    if (!room || room.status !== 'ACTIVE') return { success: false as const, error: 'Game not active' }

    const player = await prisma.player.findFirst({ where: { id: playerId, roomId: room.id } })
    if (!player) return { success: false as const, error: 'Player not in room' }

    const question = room.quizSet.questions[room.currentQ]
    if (!question) return { success: false as const, error: 'No active question' }

    const isCorrect = choiceIndex === question.correctIndex
    if (isCorrect) {
      await prisma.player.update({
        where: { id: playerId },
        data:  { score: { increment: 1000 } },
      })
    }

    // Broadcast anonymized answer count to host (no player identity)
    await pusher.trigger(`room-${roomCode}`, 'answer-submitted', { choiceIndex })

    return { success: true as const, data: { isCorrect } }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

// Host: เฉลยคำตอบ + broadcast scores ปัจจุบัน
export async function revealResult(roomCode: string) {
  try {
    const user = await getDbUser()
    const room = await assertHostOwnsRoom(roomCode, user.id)
    const question = room.quizSet.questions[room.currentQ]
    if (!question) return { success: false as const, error: 'No active question' }

    const players = await prisma.player.findMany({
      where:   { roomId: room.id },
      orderBy: { score: 'desc' },
    })

    await pusher.trigger(`room-${roomCode}`, 'round-result', {
      correctIndex: question.correctIndex,
      players: players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    })

    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

// Host: ไปข้อถัดไป หรือแสดง leaderboard ถ้าจบแล้ว
export async function nextQuestion(roomCode: string) {
  try {
    const user = await getDbUser()
    const room = await assertHostOwnsRoom(roomCode, user.id)
    const nextIndex = room.currentQ + 1
    const totalQ = room.quizSet.questions.length

    if (nextIndex >= totalQ) {
      // จบเกม — broadcast leaderboard
      const players = await prisma.player.findMany({
        where:   { roomId: room.id },
        orderBy: { score: 'desc' },
      })
      await pusher.trigger(`room-${roomCode}`, 'leaderboard', {
        players: players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
        final: true,
      })
      return { success: true as const, data: { final: true } }
    }

    // ไปข้อถัดไป
    await prisma.room.update({ where: { code: roomCode }, data: { currentQ: nextIndex } })

    const nextQ = room.quizSet.questions[nextIndex]
    await pusher.trigger(`room-${roomCode}`, 'question-revealed', {
      questionIndex: nextIndex,
      total:         totalQ,
      text:          nextQ.text,
      choices:       nextQ.choices,
      timeLimitSecs: nextQ.timeLimitSecs,
    })

    return { success: true as const, data: { final: false } }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

// Host: ปิดห้อง
export async function endGame(roomCode: string) {
  try {
    const user = await getDbUser()
    const { userId: clerkId } = await auth()
    // re-verify via room ownership
    const room = await prisma.room.findUnique({
      where:   { code: roomCode },
      include: { quizSet: true },
    })
    if (!room || room.quizSet.hostId !== user.id) return { success: false as const, error: 'Forbidden' }

    await prisma.room.update({ where: { code: roomCode }, data: { status: 'FINISHED' } })
    await pusher.trigger(`room-${roomCode}`, 'end-game', {})

    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}
```

---

## Checklist

- [ ] `revealQuestion` broadcast `question-revealed` พร้อม question data (ไม่มี correctIndex)
- [ ] `submitAnswer` อัปเดต score ใน DB ถ้าถูก + broadcast `answer-submitted`
- [ ] `revealResult` broadcast `round-result` พร้อม correctIndex + player scores
- [ ] `nextQuestion` ไปข้อถัดไป หรือ broadcast `leaderboard` ถ้าหมดแล้ว
- [ ] `endGame` update status + broadcast `end-game`
- [ ] `npm run build` ผ่าน

## Notes

- Score = 1000 points per correct answer (flat, ไม่มี time bonus — Phase 4)
- `answer-submitted` broadcast แค่ `choiceIndex` ไม่มี playerId (กัน spoil)
- `assertHostOwnsRoom` ตรวจทั้ง ownership และ room.status === 'ACTIVE'
- `nextQuestion` แก้ `room.currentQ` ใน DB ก่อน broadcast question ใหม่
- `endGame` มี duplicate auth check เพราะ `assertHostOwnsRoom` ต้องการ status ACTIVE แต่ endGame อาจถูกเรียกหลัง leaderboard (status ยังเป็น ACTIVE)
