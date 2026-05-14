import { pusher } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
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
