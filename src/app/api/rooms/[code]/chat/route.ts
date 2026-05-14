import { pusher } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const { playerId, playerName, text } = await req.json()

  if (!playerId || !playerName || !text?.trim()) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const player = await prisma.player.findFirst({
    where: { id: playerId, room: { code } },
  })
  if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  await pusher.trigger(`presence-room-${code}`, 'chat-message', {
    senderId:   playerId,
    senderName: player.name,
    text:       text.trim(),
  })

  return NextResponse.json({ ok: true })
}
