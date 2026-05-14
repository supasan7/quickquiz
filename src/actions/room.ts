'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'

async function getDbUser() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) throw new Error('User not found in DB')
  return user
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

export async function createRoom(quizSetId: string) {
  try {
    const user = await getDbUser()
    const quizSet = await prisma.quizSet.findUnique({ where: { id: quizSetId } })
    if (!quizSet || quizSet.hostId !== user.id) return { success: false as const, error: 'Forbidden' }

    let code: string
    let attempts = 0
    do {
      code = generateCode()
      if (++attempts > 10) return { success: false as const, error: 'Could not generate unique code' }
    } while (await prisma.room.findUnique({ where: { code } }))

    const room = await prisma.room.create({ data: { code, quizSetId } })
    return { success: true as const, data: room }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

export async function joinRoom(roomCode: string, playerName: string) {
  try {
    const room = await prisma.room.findUnique({ where: { code: roomCode } })
    if (!room) return { success: false as const, error: 'Room not found' }
    if (room.status !== 'LOBBY') return { success: false as const, error: 'Game already started' }

    const trimmedName = playerName.trim()
    if (!trimmedName) return { success: false as const, error: 'Name is required' }

    const player = await prisma.player.create({
      data: { roomId: room.id, name: trimmedName },
    })
    return { success: true as const, data: { playerId: player.id, playerName: player.name } }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

export async function startGame(roomCode: string) {
  try {
    const user = await getDbUser()
    const room = await prisma.room.findUnique({
      where:   { code: roomCode },
      include: { quizSet: true },
    })
    if (!room || room.quizSet.hostId !== user.id) return { success: false as const, error: 'Forbidden' }
    if (room.status !== 'LOBBY') return { success: false as const, error: 'Room is not in lobby' }

    await prisma.room.update({ where: { code: roomCode }, data: { status: 'ACTIVE' } })
    await pusher.trigger(`presence-room-${roomCode}`, 'game-start', {})

    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}
