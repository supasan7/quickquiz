'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { deleteQuizSet } from '@/actions/quiz'
import HostGameButton from '@/components/room/HostGameButton'

type Props = {
  quizSet: {
    id:          string
    title:       string
    description: string | null
  }
  questionCount: number
}

export default function QuizCard({ quizSet, questionCount }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{quizSet.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {quizSet.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{quizSet.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {questionCount} question{questionCount !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2 pt-1 flex-wrap">
          <HostGameButton quizSetId={quizSet.id} />
          <Link href={`/quiz/${quizSet.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>Edit</Link>
          <form action={() => { void deleteQuizSet(quizSet.id) }}>
            <Button size="sm" variant="destructive" type="submit">Delete</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
