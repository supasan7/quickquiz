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
