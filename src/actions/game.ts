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

async function assertHostOwnsRoom(roomCode: string, userId: string) {
  const room = await prisma.room.findUnique({
    where:   { code: roomCode },
    include: { quizSet: { include: { questions: { orderBy: { order: 'asc' } } } } },
  })
  if (!room || room.quizSet.hostId !== userId) throw new Error('Forbidden')
  if (room.status !== 'ACTIVE') throw new Error('Game is not active')
  return room
}

export async function revealQuestion(roomCode: string) {
  try {
    const user = await getDbUser()
    const room = await assertHostOwnsRoom(roomCode, user.id)
    const question = room.quizSet.questions[room.currentQ]
    if (!question) return { success: false as const, error: 'No more questions' }

    await pusher.trigger(`room-${roomCode}`, 'question-revealed', {
      questionIndex: room.currentQ,
      total:         room.quizSet.questions.length,
      text:          question.text,
      choices:       question.choices,
      timeLimitSecs: question.timeLimitSecs,
    })

    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

export async function revealResult(roomCode: string) {
  try {
    const user = await getDbUser()
    const room = await assertHostOwnsRoom(roomCode, user.id)
    const question = room.quizSet.questions[room.currentQ]
    if (!question) return { success: false as const, error: 'No active question' }

    const players = await prisma.player.findMany({
      where:   { roomId: room.id },
      orderBy: { score: 'desc' },
    })

    await pusher.trigger(`room-${roomCode}`, 'round-result', {
      correctIndex: question.correctIndex,
      players: players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    })

    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

export async function nextQuestion(roomCode: string) {
  try {
    const user = await getDbUser()
    const room = await assertHostOwnsRoom(roomCode, user.id)
    const nextIndex = room.currentQ + 1
    const totalQ    = room.quizSet.questions.length

    if (nextIndex >= totalQ) {
      const players = await prisma.player.findMany({
        where:   { roomId: room.id },
        orderBy: { score: 'desc' },
      })
      await pusher.trigger(`room-${roomCode}`, 'leaderboard', {
        players: players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
        final:   true,
      })
      return { success: true as const, data: { final: true } }
    }

    await prisma.room.update({ where: { code: roomCode }, data: { currentQ: nextIndex } })

    const nextQ = room.quizSet.questions[nextIndex]
    await pusher.trigger(`room-${roomCode}`, 'question-revealed', {
      questionIndex: nextIndex,
      total:         totalQ,
      text:          nextQ.text,
      choices:       nextQ.choices,
      timeLimitSecs: nextQ.timeLimitSecs,
    })

    return { success: true as const, data: { final: false } }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

export async function endGame(roomCode: string) {
  try {
    const user = await getDbUser()
    const room = await prisma.room.findUnique({
      where:   { code: roomCode },
      include: { quizSet: true },
    })
    if (!room || room.quizSet.hostId !== user.id) return { success: false as const, error: 'Forbidden' }
    if (room.status === 'FINISHED') return { success: false as const, error: 'Game already ended' }

    await prisma.room.update({ where: { code: roomCode }, data: { status: 'FINISHED' } })
    await pusher.trigger(`room-${roomCode}`, 'end-game', {})

    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}
