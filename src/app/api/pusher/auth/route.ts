import { auth } from '@clerk/nextjs/server'
import { pusher } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')!
  const channel  = params.get('channel_name')!
  const playerId = params.get('playerId')

  if (channel.startsWith('presence-')) {
    if (playerId) {
      const player = await prisma.player.findUnique({ where: { id: playerId } })
      if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

      const authResponse = pusher.authorizeChannel(socketId, channel, {
        user_id:   playerId,
        user_info: { name: player.name, isHost: false },
      })
      return NextResponse.json(authResponse)
    }

    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const authResponse = pusher.authorizeChannel(socketId, channel, {
      user_id:   `host-${user.id}`,
      user_info: { name: user.name, isHost: true },
    })
    return NextResponse.json(authResponse)
  }

  // Private channels (Phase 3+)
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const authResponse = pusher.authorizeChannel(socketId, channel)
  return NextResponse.json(authResponse)
}
