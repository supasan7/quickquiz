'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { updateQuizSet, deleteQuestion } from '@/actions/quiz'
import QuestionEditor from './QuestionEditor'
import HostGameButton from '@/components/room/HostGameButton'

type Question = {
  id:            string
  text:          string
  choices:       string[]
  correctIndex:  number
  timeLimitSecs: number
  order:         number
}

type QuizSet = {
  id:          string
  title:       string
  description: string | null
  questions:   Question[]
}

const metaSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
})

type MetaValues = z.infer<typeof metaSchema>

export default function QuizEditor({ quizSet }: { quizSet: QuizSet }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MetaValues>({
    resolver:      zodResolver(metaSchema),
    defaultValues: {
      title:       quizSet.title,
      description: quizSet.description ?? '',
    },
  })

  async function onSaveMeta(values: MetaValues) {
    const fd = new FormData()
    fd.set('title', values.title)
    if (values.description) fd.set('description', values.description)
    await updateQuizSet(quizSet.id, fd)
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Back to Dashboard
        </Link>
        <HostGameButton quizSetId={quizSet.id} />
      </div>

      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Edit Quiz</h1>
        <form onSubmit={handleSubmit(onSaveMeta)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" {...register('description')} rows={2} />
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty} size="sm">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Questions ({quizSet.questions.length})
          </h2>
          <Button size="sm" onClick={() => setEditingId('new')} disabled={editingId !== null}>
            + Add Question
          </Button>
        </div>

        <div className="space-y-3">
          {quizSet.questions.map((q, i) =>
            editingId === q.id ? (
              <QuestionEditor
                key={q.id}
                quizSetId={quizSet.id}
                question={q}
                order={i}
                onDone={() => { setEditingId(null); router.refresh() }}
              />
            ) : (
              <div key={q.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {i + 1}. {q.text}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {q.choices.length} choices · {q.timeLimitSecs}s · correct: choice {q.correctIndex + 1}
                  </p>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(q.id)}
                    disabled={editingId !== null}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={editingId !== null}
                    onClick={async () => {
                      await deleteQuestion(quizSet.id, q.id)
                      router.refresh()
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )
          )}

          {editingId === 'new' && (
            <QuestionEditor
              quizSetId={quizSet.id}
              order={quizSet.questions.length}
              onDone={() => { setEditingId(null); router.refresh() }}
            />
          )}
        </div>
      </section>
    </main>
  )
}
