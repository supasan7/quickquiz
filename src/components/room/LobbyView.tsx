'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PusherJs from 'pusher-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinRoom } from '@/actions/room'

type Member = { id: string; info: { name: string; isHost: boolean; avatar?: string } }
type ChatMessage = { senderId: string; senderName: string; text: string }
type Identity = { playerId: string; playerName: string; avatar: string }

type Props = { roomCode: string }

export default function LobbyView({ roomCode }: Props) {
  const router = useRouter()

  const storageKey = `lobby-${roomCode}`
  const [identity,  setIdentity]  = useState<Identity | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [joining,   setJoining]   = useState(false)
  const [joinError, setJoinError] = useState('')

  const [members,  setMembers]  = useState<Member[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Restore identity from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey)
    if (stored) setIdentity(JSON.parse(stored) as Identity)
  }, [storageKey])

  // Connect to Pusher once identity is known
  useEffect(() => {
    if (!identity) return

    const pusher = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster:      process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth:         { params: { playerId: identity.playerId, avatar: identity.avatar } },
    })

    const channel = pusher.subscribe(`presence-room-${roomCode}`) as any

    channel.bind('pusher:subscription_succeeded', (data: { members: Record<string, { name: string; isHost: boolean; avatar?: string }> }) => {
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
  }, [identity, roomCode, router])

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fallback join (for direct URL access without landing page)
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

    const id: Identity = { playerId: result.data.playerId, playerName: result.data.playerName, avatar: 'cat' }
    sessionStorage.setItem(storageKey, JSON.stringify(id))
    setIdentity(id)
    setJoining(false)
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    const text = chatText.trim()
    if (!text || !identity) return
    setChatText('')

    await fetch(`/api/rooms/${roomCode}/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ playerId: identity.playerId, playerName: identity.playerName, text }),
    })
  }

  // Name entry screen (fallback — normally bypassed via landing page)
  if (!identity) {
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

  // Lobby screen
  const players = members.filter((m) => !m.info.isHost)

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Room Code</p>
        <h1 className="text-3xl font-bold tracking-widest">{roomCode}</h1>
        <p className="text-muted-foreground mt-1">Waiting for the host to start…</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <section className="space-y-2">
          <h2 className="font-semibold">Players ({players.length})</h2>
          <ul className="space-y-1">
            {players.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2 border rounded-xl bg-card">
                <img src={`/avatar/${m.info.avatar ?? 'cat'}.svg`} alt="" className="w-8 h-8" />
                <span className="font-semibold text-sm flex-1">{m.info.name}</span>
                {m.id === identity.playerId && (
                  <span className="text-muted-foreground text-xs">(you)</span>
                )}
              </li>
            ))}
          </ul>
        </section>

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
