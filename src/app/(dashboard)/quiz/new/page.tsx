'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createQuizSet } from '@/actions/quiz'

const schema = z.object({
  title:       z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof schema>

export default function NewQuizPage() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    const fd = new FormData()
    fd.set('title', values.title)
    if (values.description) fd.set('description', values.description)

    const result = await createQuizSet(fd)
    if (result.success) {
      router.push(`/quiz/${result.data.id}`)
    } else {
      alert(typeof result.error === 'string' ? result.error : 'Failed to create quiz')
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-2">New Quiz Set</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register('title')} placeholder="e.g. World Capitals" />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Brief description of this quiz"
            rows={3}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Quiz'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </main>
  )
}
