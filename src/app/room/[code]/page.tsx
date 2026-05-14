import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import HostRoomView from '@/components/room/HostRoomView'

export default async function HostRoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/sign-in')

  const room = await prisma.room.findUnique({
    where:   { code },
    include: { quizSet: true },
  })

  if (!room || room.quizSet.hostId !== user.id) notFound()
  if (room.status !== 'LOBBY') redirect('/dashboard')

  return <HostRoomView roomCode={code} />
}
