'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ─── Schemas ─────────────────────────────────────────────────

const QuizSetSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
})

const QuestionSchema = z.object({
  text:          z.string().min(1, 'Question text is required'),
  choices:       z.array(z.string().min(1, 'Choice cannot be empty')).min(2).max(4),
  correctIndex:  z.number().int().min(0).max(3),
  timeLimitSecs: z.number().int().min(5).max(120).default(20),
  order:         z.number().int().min(0),
})

// ─── Helpers ──────────────────────────────────────────────────

async function getDbUser() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) throw new Error('User not found in DB')
  return user
}

async function assertOwnsQuizSet(quizSetId: string, userId: string) {
  const qs = await prisma.quizSet.findUnique({ where: { id: quizSetId } })
  if (!qs || qs.hostId !== userId) throw new Error('Forbidden')
}

// ─── Quiz Set Actions ─────────────────────────────────────────

export async function createQuizSet(formData: FormData) {
  try {
    const user = await getDbUser()
    const parsed = QuizSetSchema.safeParse({
      title:       formData.get('title'),
      description: formData.get('description') || undefined,
    })
    if (!parsed.success) return { success: false as const, error: parsed.error.flatten() }

    const quizSet = await prisma.quizSet.create({
      data: { ...parsed.data, hostId: user.id },
    })
    revalidatePath('/dashboard')
    return { success: true as const, data: quizSet }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

export async function updateQuizSet(id: string, formData: FormData) {
  try {
    const user = await getDbUser()
    await assertOwnsQuizSet(id, user.id)

    const parsed = QuizSetSchema.safeParse({
      title:       formData.get('title'),
      description: formData.get('description') || undefined,
    })
    if (!parsed.success) return { success: false as const, error: parsed.error.flatten() }

    const quizSet = await prisma.quizSet.update({ where: { id }, data: parsed.data })
    revalidatePath(`/quiz/${id}`)
    revalidatePath('/dashboard')
    return { success: true as const, data: quizSet }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

export async function deleteQuizSet(id: string) {
  try {
    const user = await getDbUser()
    await assertOwnsQuizSet(id, user.id)
    await prisma.quizSet.delete({ where: { id } })
    revalidatePath('/dashboard')
    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

// ─── Question Actions ─────────────────────────────────────────

export async function upsertQuestion(
  quizSetId: string,
  data: z.infer<typeof QuestionSchema> & { id?: string }
) {
  try {
    const user = await getDbUser()
    await assertOwnsQuizSet(quizSetId, user.id)

    const parsed = QuestionSchema.safeParse(data)
    if (!parsed.success) return { success: false as const, error: parsed.error.flatten() }

    const question = data.id
      ? await prisma.question.update({ where: { id: data.id }, data: parsed.data })
      : await prisma.question.create({ data: { ...parsed.data, quizSetId } })

    revalidatePath(`/quiz/${quizSetId}`)
    return { success: true as const, data: question }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}

export async function deleteQuestion(quizSetId: string, questionId: string) {
  try {
    const user = await getDbUser()
    await assertOwnsQuizSet(quizSetId, user.id)
    await prisma.question.delete({ where: { id: questionId } })
    revalidatePath(`/quiz/${quizSetId}`)
    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}
