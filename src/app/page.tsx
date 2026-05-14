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
  const [avatarIdx, setAvatarIdx] = useState(2) // default: cat
  const [name,    setName]    = useState('')
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const avatar = AVATARS[avatarIdx]

  function cycleAvatar() {
    setAvatarIdx((i) => (i + 1) % AVATARS.length)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const trimCode = code.trim().toUpperCase()
    const trimName = name.trim()
    if (!trimCode || !trimName) return

    setLoading(true)
    setError('')

    const res = await fetch(`/api/rooms/${trimCode}`)
    if (!res.ok) {
      setError('Room not found or game already started')
      setLoading(false)
      return
    }

    const result = await joinRoom(trimCode, trimName)
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    sessionStorage.setItem(`lobby-${trimCode}`, JSON.stringify({
      playerId:   result.data.playerId,
      playerName: result.data.playerName,
      avatar,
    }))

    router.push(`/play/${trimCode}/lobby`)
  }

  const canSubmit = name.trim() && code.trim() && !loading

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-6">

      {/* Logo */}
      <Image
        src="/logo/quickquiz-logo.svg"
        alt="QuickQuiz"
        width={360}
        height={168}
        priority
        className="w-56 sm:w-72 md:w-80 h-auto"
      />

      {/* Card */}
      <div className="w-full max-w-md rounded-3xl p-6 space-y-5"
        style={{ background: 'rgba(10, 4, 30, 0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139,92,246,0.3)' }}
      >
        {/* Avatar + Inputs */}
        <div className="flex gap-5 items-center">

          {/* Big avatar — click to cycle */}
          <button
            type="button"
            onClick={cycleAvatar}
            title="Click to change character"
            className="relative shrink-0 group"
          >
            <div className="w-28 h-28 rounded-full bg-primary/20 border-4 border-primary
                            flex items-center justify-center
                            group-hover:scale-105 group-active:scale-95 transition-all duration-150">
              <Image
                src={`/avatar/${avatar}.svg`}
                alt={avatar}
                width={80}
                height={80}
                className="w-20 h-20"
              />
            </div>
            <span className="absolute bottom-0.5 right-0.5
                             w-7 h-7 rounded-full bg-primary border-2 border-white
                             flex items-center justify-center
                             text-white font-black text-sm">
              ?
            </span>
          </button>

          {/* Inputs */}
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <Label className="text-sm font-bold text-white/80">Your Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={30}
                autoComplete="off"
                className="h-11 text-base bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-bold text-white/80">Room Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XQZT7"
                maxLength={10}
                autoComplete="off"
                className="h-11 text-xl font-black tracking-widest bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-primary"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          </div>
        </div>

        {/* JOIN button — white background */}
        <button
          onClick={handleJoin}
          disabled={!canSubmit}
          className={[
            'w-full h-14 rounded-2xl flex items-center justify-center gap-3',
            'font-black text-xl transition-all duration-150',
            canSubmit
              ? 'bg-white text-primary hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/30'
              : 'bg-white/20 text-white/40 cursor-not-allowed',
          ].join(' ')}
        >
          <span className={`text-2xl ${canSubmit ? 'text-primary' : 'text-white/40'}`}>▶</span>
          {loading ? 'Joining…' : 'JOIN GAME'}
        </button>
      </div>

      {/* Sign in */}
      <p className="text-sm text-white/50">
        Want to host?{' '}
        <Link href="/sign-in" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
