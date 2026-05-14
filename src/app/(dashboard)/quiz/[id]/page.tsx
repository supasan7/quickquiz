import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import QuizEditor from '@/components/quiz/QuizEditor'

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/sign-in')

  const quizSet = await prisma.quizSet.findUnique({
    where:   { id },
    include: { questions: { orderBy: { order: 'asc' } } },
  })

  if (!quizSet || quizSet.hostId !== user.id) notFound()

  return <QuizEditor quizSet={quizSet} />
}
