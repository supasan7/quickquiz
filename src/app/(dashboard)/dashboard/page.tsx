import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import QuizCard from '@/components/quiz/QuizCard'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where:   { clerkId: userId },
    include: {
      quizSets: {
        include: { questions: { select: { id: true } } },
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!user) redirect('/sign-in')

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Quiz Sets</h1>
        <Link href="/quiz/new" className={buttonVariants()}>+ New Quiz</Link>
      </div>

      {user.quizSets.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">
          No quiz sets yet.{' '}
          <Link href="/quiz/new" className="underline">Create your first one!</Link>
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {user.quizSets.map((qs) => (
            <QuizCard
              key={qs.id}
              quizSet={qs}
              questionCount={qs.questions.length}
            />
          ))}
        </div>
      )}
    </main>
  )
}
