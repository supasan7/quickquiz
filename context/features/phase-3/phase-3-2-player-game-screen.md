# Phase 3-2 — Player Game Screen

## Status

Not Started

## Goals

หน้าเล่นเกมสำหรับ player — เห็นคำถาม, ตอบภายในเวลา, เห็นผลหลังเฉลย
ใช้ `room-{code}` public channel (ไม่ต้อง auth)

**Route:** `/play/[code]/game`
**Depends on:** Phase 3-1 (`submitAnswer`), Phase 2-3 (player identity ใน sessionStorage)

---

## Files to Create

| File | Action |
|---|---|
| `src/app/play/[code]/game/page.tsx` | Create |
| `src/components/game/PlayerGameView.tsx` | Create |

---

## Game State Machine

```
waiting          → รอ host กด Reveal Question
    ↓ question-revealed
question         → แสดงคำถาม + countdown timer + answer buttons
    ↓ player taps answer
answered         → ปุ่ม lock in, รอ host เฉลย
    ↓ round-result
result           → แสดงถูก/ผิด + score ปัจจุบัน
    ↓ question-revealed (next) | leaderboard (final)
leaderboard      → แสดง final leaderboard
    ↓ end-game
ended            → "Thanks for playing!"
```

---

## Tasks

### 1. Game Page (Server Component)

**`src/app/play/[code]/game/page.tsx`:**

```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PlayerGameView from '@/components/game/PlayerGameView'

export default async function GamePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const room = await prisma.room.findUnique({
    where:  { code },
    select: { code: true, status: true },
  })

  if (!room || room.status === 'LOBBY') notFound()

  return <PlayerGameView roomCode={code} />
}
```

---

### 2. PlayerGameView Client Component

**`src/components/game/PlayerGameView.tsx`:**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PusherJs from 'pusher-js'
import { submitAnswer } from '@/actions/game'

type QuestionData = {
  questionIndex: number
  total:         number
  text:          string
  choices:       string[]
  timeLimitSecs: number
}

type PlayerData = { id: string; name: string; score: number }

type GamePhase =
  | { phase: 'waiting' }
  | { phase: 'question'; question: QuestionData; timeLeft: number }
  | { phase: 'answered';  question: QuestionData; myChoice: number }
  | { phase: 'result';    question: QuestionData; myChoice: number; correctIndex: number; players: PlayerData[] }
  | { phase: 'leaderboard'; players: PlayerData[] }
  | { phase: 'ended' }

const ANSWER_COLORS = ['bg-answer-a', 'bg-answer-b', 'bg-answer-c', 'bg-answer-d']
const ANSWER_ICONS  = ['▲', '◆', '●', '■']

type Props = { roomCode: string }

export default function PlayerGameView({ roomCode }: Props) {
  const router = useRouter()
  const [state, setState] = useState<GamePhase>({ phase: 'waiting' })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore playerId from sessionStorage
  const storageKey = `lobby-${roomCode}`
  const stored     = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null
  const identity   = stored ? JSON.parse(stored) as { playerId: string; playerName: string } : null

  useEffect(() => {
    const pusher = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channel = pusher.subscribe(`room-${roomCode}`)

    channel.bind('question-revealed', (data: QuestionData) => {
      if (timerRef.current) clearInterval(timerRef.current)
      let timeLeft = data.timeLimitSecs
      setState({ phase: 'question', question: data, timeLeft })

      timerRef.current = setInterval(() => {
        timeLeft -= 1
        setState((prev) =>
          prev.phase === 'question' ? { ...prev, timeLeft: Math.max(0, timeLeft) } : prev
        )
        if (timeLeft <= 0) clearInterval(timerRef.current!)
      }, 1000)
    })

    channel.bind('round-result', (data: { correctIndex: number; players: PlayerData[] }) => {
      if (timerRef.current) clearInterval(timerRef.current)
      setState((prev) => {
        if (prev.phase !== 'answered' && prev.phase !== 'question') return prev
        const myChoice = prev.phase === 'answered' ? prev.myChoice : -1
        return { phase: 'result', question: prev.question, myChoice, ...data }
      })
    })

    channel.bind('leaderboard', (data: { players: PlayerData[]; final: boolean }) => {
      setState({ phase: 'leaderboard', players: data.players })
    })

    channel.bind('end-game', () => {
      setState({ phase: 'ended' })
    })

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      pusher.unsubscribe(`room-${roomCode}`)
      pusher.disconnect()
    }
  }, [roomCode])

  async function handleAnswer(choiceIndex: number) {
    if (!identity) return
    if (state.phase !== 'question') return

    setState({ phase: 'answered', question: state.question, myChoice: choiceIndex })
    if (timerRef.current) clearInterval(timerRef.current)

    await submitAnswer(roomCode, identity.playerId, choiceIndex)
  }

  // ─── Render ───────────────────────────────────────────

  if (state.phase === 'waiting') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🎮</div>
          <p className="text-xl font-bold">Get ready!</p>
          <p className="text-muted-foreground">Waiting for the host to reveal the question…</p>
        </div>
      </main>
    )
  }

  if (state.phase === 'question' || state.phase === 'answered') {
    const q        = state.question
    const answered = state.phase === 'answered'
    const myChoice = answered ? state.myChoice : -1

    return (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-muted-foreground">
            Question {q.questionIndex + 1} / {q.total}
          </span>
          <span className="text-2xl font-black text-primary">
            {state.phase === 'question' ? state.timeLeft : '–'}
          </span>
        </div>

        {state.phase === 'question' && (
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000 linear"
              style={{ width: `${(state.timeLeft / q.timeLimitSecs) * 100}%` }}
            />
          </div>
        )}

        <div className="bg-card border rounded-2xl p-6 text-center">
          <p className="text-lg font-bold leading-snug">{q.text}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answered}
              className={`
                ${ANSWER_COLORS[i]} text-white font-bold rounded-2xl p-5
                flex items-start gap-3 text-left text-sm leading-snug
                transition-all duration-150
                ${answered && myChoice === i ? 'ring-4 ring-white scale-95' : ''}
                ${answered && myChoice !== i ? 'opacity-40' : ''}
                ${!answered ? 'active:scale-95 hover:brightness-110' : ''}
                disabled:cursor-not-allowed
              `}
            >
              <span className="text-lg shrink-0">{ANSWER_ICONS[i]}</span>
              <span>{choice}</span>
            </button>
          ))}
        </div>

        {answered && (
          <p className="text-center text-muted-foreground text-sm">
            Answer locked in — waiting for the host to reveal…
          </p>
        )}
      </main>
    )
  }

  if (state.phase === 'result') {
    const isCorrect = state.myChoice === state.correctIndex
    const myScore   = state.players.find((p) => p.id === identity?.playerId)?.score ?? 0

    return (
      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <div className={`rounded-2xl p-6 text-center border-2 ${
          isCorrect ? 'bg-success/10 border-success/40' : 'bg-error/10 border-error/40'
        }`}>
          <div className="text-5xl mb-3">{isCorrect ? '✅' : '❌'}</div>
          <p className="text-xl font-black">{isCorrect ? 'Correct!' : 'Wrong!'}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Correct answer: <span className="font-bold text-foreground">{state.question.choices[state.correctIndex]}</span>
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-5 text-center">
          <p className="text-4xl font-black text-primary">{myScore.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Your score</p>
        </div>

        <div className="space-y-2">
          {state.players.slice(0, 5).map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              p.id === identity?.playerId ? 'bg-primary/10 border-primary/40' : 'bg-card'
            }`}>
              <span className="font-black text-muted-foreground w-6 text-sm">{i + 1}</span>
              <span className="flex-1 font-semibold text-sm">{p.name}</span>
              <span className="font-black text-primary text-sm">{p.score.toLocaleString()}</span>
              {p.id === identity?.playerId && (
                <span className="text-2xs font-bold bg-primary text-white px-2 py-0.5 rounded-full">You</span>
              )}
            </div>
          ))}
        </div>
      </main>
    )
  }

  if (state.phase === 'leaderboard') {
    const myRank = state.players.findIndex((p) => p.id === identity?.playerId) + 1

    return (
      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <h1 className="text-3xl font-black text-center">🏆 Final Results</h1>
        <div className="space-y-2">
          {state.players.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-4 rounded-xl border ${
              p.id === identity?.playerId ? 'bg-primary/10 border-primary/40' : 'bg-card'
            }`}>
              <span className="font-black text-xl w-8 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </span>
              <span className="flex-1 font-bold">{p.name}</span>
              <span className="font-black text-primary">{p.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
        {myRank > 0 && (
          <p className="text-center text-muted-foreground text-sm">
            You finished <span className="font-bold text-foreground">#{myRank}</span>
          </p>
        )}
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-5xl">🎉</div>
        <p className="text-2xl font-black">Game Over!</p>
        <p className="text-muted-foreground">Thanks for playing QuickQuiz</p>
        <button
          onClick={() => router.push('/play')}
          className="mt-4 px-6 py-3 bg-primary text-white font-bold rounded-xl"
        >
          Play Again
        </button>
      </div>
    </main>
  )
}
```

---

## Checklist

- [ ] `/play/[code]/game` โหลดได้, 404 ถ้า room เป็น LOBBY
- [ ] State `waiting` แสดงหน้า "Get ready!"
- [ ] `question-revealed` event → แสดงคำถาม + countdown timer
- [ ] กด answer button → state `answered`, lock in ทันที
- [ ] `round-result` → แสดง correct/wrong + score
- [ ] `leaderboard` event → แสดง final leaderboard
- [ ] `end-game` event → แสดงหน้า "Game Over"
- [ ] `npm run build` ผ่าน

## Notes

- Subscribe `room-{code}` เป็น public channel — ไม่ต้อง auth
- `identity` ดึงจาก sessionStorage key `lobby-{roomCode}` (สร้างใน Phase 2-3)
- ถ้าไม่มี identity ใน sessionStorage (เข้า URL ตรง) → แสดง UI แบบ spectator ได้ (answer disabled)
- Timer countdown เป็น client-side — เริ่มนับเมื่อ `question-revealed` มาถึง
- `myChoice` stored ใน state เพื่อ compare กับ `correctIndex` ตอน `round-result`
