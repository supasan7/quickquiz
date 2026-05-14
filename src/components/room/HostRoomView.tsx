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
}

export default function HostRoomView({ roomCode }: Props) {
  const router = useRouter()
  const [members,  setMembers]  = useState<Member[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [starting, setStarting] = useState(false)

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
