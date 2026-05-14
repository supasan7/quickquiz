import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import LobbyView from '@/components/room/LobbyView'

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const room = await prisma.room.findUnique({
    where:  { code },
    select: { code: true, status: true },
  })

  if (!room || room.status !== 'LOBBY') notFound()

  return <LobbyView roomCode={code} />
}
