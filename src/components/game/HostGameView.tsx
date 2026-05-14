'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PusherJs from 'pusher-js'
import { Button } from '@/components/ui/button'
import { revealQuestion, revealResult, nextQuestion, endGame } from '@/actions/game'

type QuestionData = {
  questionIndex: number
  total:         number
  text:          string
  choices:       string[]
  timeLimitSecs: number
}

type PlayerData = { id: string; name: string; score: number }

type HostPhase =
  | { phase: 'pre-reveal'; currentQ: number; total: number }
  | { phase: 'question';   question: QuestionData; answerCounts: number[] }
  | { phase: 'result';     question: QuestionData; correctIndex: number; players: PlayerData[] }
  | { phase: 'leaderboard'; players: PlayerData[] }

const ANSWER_COLORS = ['bg-answer-a', 'bg-answer-b', 'bg-answer-c', 'bg-answer-d']
const ANSWER_ICONS  = ['▲', '◆', '●', '■']

type Props = { roomCode: string; totalQuestions: number; currentQ: number }

export default function HostGameView({ roomCode, totalQuestions, currentQ }: Props) {
  const router = useRouter()
  const [state,   setState]   = useState<HostPhase>({ phase: 'pre-reveal', currentQ, total: totalQuestions })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const pusher = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channel = pusher.subscribe(`room-${roomCode}`)

    channel.bind('question-revealed', (data: QuestionData) => {
      setState({ phase: 'question', question: data, answerCounts: new Array(data.choices.length).fill(0) })
    })

    channel.bind('answer-submitted', (data: { choiceIndex: number }) => {
      setState((prev) => {
        if (prev.phase !== 'question') return prev
        const counts = [...prev.answerCounts]
        counts[data.choiceIndex] = (counts[data.choiceIndex] ?? 0) + 1
        return { ...prev, answerCounts: counts }
      })
    })

    channel.bind('round-result', (data: { correctIndex: number; players: PlayerData[] }) => {
      setState((prev) => {
        if (prev.phase !== 'question') return prev
        return { phase: 'result', question: prev.question, ...data }
      })
    })

    channel.bind('leaderboard', (data: { players: PlayerData[] }) => {
      setState({ phase: 'leaderboard', players: data.players })
    })

    return () => {
      pusher.unsubscribe(`room-${roomCode}`)
      pusher.disconnect()
    }
  }, [roomCode])

  async function handleRevealQuestion() {
    setLoading(true)
    await revealQuestion(roomCode)
    setLoading(false)
  }

  async function handleRevealResult() {
    setLoading(true)
    await revealResult(roomCode)
    setLoading(false)
  }

  async function handleNext() {
    setLoading(true)
    await nextQuestion(roomCode)
    setLoading(false)
  }

  async function handleEndGame() {
    setLoading(true)
    await endGame(roomCode)
    router.push('/dashboard')
  }

  // ─── Pre-reveal ────────────────────────────────────────

  if (state.phase === 'pre-reveal') {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Room Code</p>
            <h1 className="text-3xl font-black tracking-widest">{roomCode}</h1>
          </div>
          <Button onClick={handleRevealQuestion} disabled={loading} size="lg">
            {loading ? 'Loading…' : `▶ Reveal Question ${state.currentQ + 1}`}
          </Button>
        </div>
        <p className="text-muted-foreground text-center py-12">
          Question {state.currentQ + 1} of {state.total} — click to reveal
        </p>
      </main>
    )
  }

  // ─── Question (live counts) ────────────────────────────

  if (state.phase === 'question') {
    const total = state.answerCounts.reduce((a, b) => a + b, 0)

    return (
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="font-bold text-muted-foreground">
            Question {state.question.questionIndex + 1} / {state.question.total}
          </p>
          <Button onClick={handleRevealResult} disabled={loading}>
            {loading ? 'Revealing…' : 'Reveal Answer'}
          </Button>
        </div>

        <div className="bg-card border rounded-2xl p-6 text-center">
          <p className="text-xl font-bold">{state.question.text}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {state.question.choices.map((choice, i) => {
            const count = state.answerCounts[i] ?? 0
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={i} className={`${ANSWER_COLORS[i]} rounded-2xl p-4 text-white space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>{ANSWER_ICONS[i]}</span>
                  <span className="flex-1">{choice}</span>
                  <span className="font-black">{count}</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/70 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground">{total} answers received</p>
      </main>
    )
  }

  // ─── Result ────────────────────────────────────────────

  if (state.phase === 'result') {
    return (
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="font-bold">
            Correct answer:{' '}
            <span className="text-primary">{state.question.choices[state.correctIndex]}</span>
          </p>
          <Button onClick={handleNext} disabled={loading}>
            {loading ? 'Loading…' : 'Next Question →'}
          </Button>
        </div>

        <div className="space-y-2">
          {state.players.slice(0, 8).map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-card border rounded-xl">
              <span className="font-black text-muted-foreground w-6 text-sm">{i + 1}</span>
              <span className="flex-1 font-semibold text-sm">{p.name}</span>
              <span className="font-black text-primary">{p.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </main>
    )
  }

  // ─── Leaderboard ───────────────────────────────────────

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">🏆 Final Leaderboard</h1>
        <Button onClick={handleEndGame} variant="destructive" disabled={loading}>
          {loading ? 'Ending…' : 'End Game'}
        </Button>
      </div>

      <div className="space-y-2">
        {state.players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-4 bg-card border rounded-xl">
            <span className="font-black text-xl w-8 text-center">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            <span className="flex-1 font-bold">{p.name}</span>
            <span className="font-black text-primary">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
