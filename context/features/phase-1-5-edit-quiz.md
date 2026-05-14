# Phase 1-5 — Edit Quiz Page

## Status

Not Started

## Goals

หน้าแก้ไข quiz set — แก้ title/description และจัดการ questions (เพิ่ม, แก้ไข, ลบ)
เป็น module ที่ซับซ้อนที่สุดใน Phase 1 เพราะมี interactive question list

**Route:** `/quiz/[id]`
**Depends on:** Phase 1-2 (`updateQuizSet`, `upsertQuestion`, `deleteQuestion`)

---

## Files to Create

| File | Action |
|---|---|
| `src/app/(dashboard)/quiz/[id]/page.tsx` | Create |
| `src/components/quiz/QuizEditor.tsx` | Create |
| `src/components/quiz/QuestionEditor.tsx` | Create |

---

## Tasks

### 1. Edit Quiz Page (Server Component)

**`src/app/(dashboard)/quiz/[id]/page.tsx`:**

```tsx
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
```

---

### 2. QuizEditor Component

**`src/components/quiz/QuizEditor.tsx`:**

```tsx
'use client'

import { useState } from 'react'
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
      {/* Back link */}
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← Back to Dashboard
      </Link>

      {/* Quiz metadata */}
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

      {/* Questions */}
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
                onDone={() => setEditingId(null)}
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
                  <form action={deleteQuestion.bind(null, quizSet.id, q.id)}>
                    <Button size="sm" variant="destructive" type="submit">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            )
          )}

          {editingId === 'new' && (
            <QuestionEditor
              quizSetId={quizSet.id}
              order={quizSet.questions.length}
              onDone={() => setEditingId(null)}
            />
          )}
        </div>
      </section>
    </main>
  )
}
```

---

### 3. QuestionEditor Component

**`src/components/quiz/QuestionEditor.tsx`:**

```tsx
'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upsertQuestion } from '@/actions/quiz'

const schema = z.object({
  text:          z.string().min(1, 'Question text is required'),
  choices:       z.array(z.object({ value: z.string().min(1, 'Cannot be empty') })).min(2).max(4),
  correctIndex:  z.number().int().min(0),
  timeLimitSecs: z.number().int().min(5).max(120),
})

type FormValues = z.infer<typeof schema>

type Props = {
  quizSetId: string
  question?: {
    id:            string
    text:          string
    choices:       string[]
    correctIndex:  number
    timeLimitSecs: number
    order:         number
  }
  order: number
  onDone: () => void
}

export default function QuestionEditor({ quizSetId, question, order, onDone }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver:      zodResolver(schema),
    defaultValues: {
      text:          question?.text ?? '',
      choices:       (question?.choices ?? ['', '', '', '']).map((v) => ({ value: v })),
      correctIndex:  question?.correctIndex ?? 0,
      timeLimitSecs: question?.timeLimitSecs ?? 20,
    },
  })

  const { fields } = useFieldArray({ control, name: 'choices' })
  const correctIndex = watch('correctIndex')

  async function onSubmit(values: FormValues) {
    const result = await upsertQuestion(quizSetId, {
      text:          values.text,
      choices:       values.choices.map((c) => c.value),
      correctIndex:  values.correctIndex,
      timeLimitSecs: values.timeLimitSecs,
      order,
      id:            question?.id,
    })
    if (result.success) onDone()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border rounded-lg p-4 space-y-4 bg-muted/30"
    >
      <div className="space-y-1">
        <Label>Question</Label>
        <Input {...register('text')} placeholder="Enter question text" />
        {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Answer Choices</Label>
        <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <input
              type="radio"
              name="correctIndex"
              checked={correctIndex === i}
              onChange={() => setValue('correctIndex', i)}
              className="shrink-0"
            />
            <Input
              {...register(`choices.${i}.value`)}
              placeholder={`Choice ${i + 1}`}
            />
          </div>
        ))}
        {errors.choices && (
          <p className="text-sm text-destructive">All choices must be filled in</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="timeLimitSecs">Time Limit (seconds)</Label>
        <Input
          id="timeLimitSecs"
          type="number"
          min={5}
          max={120}
          {...register('timeLimitSecs', { valueAsNumber: true })}
          className="w-28"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? 'Saving...' : question ? 'Save' : 'Add Question'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
```

---

## Checklist

- [ ] `/quiz/[id]` โหลดได้ แสดง title, description, และ questions
- [ ] 404 ถ้า quiz set ไม่ใช่ของ host ที่ login อยู่
- [ ] แก้ title/description แล้วกด "Save Changes" — อัปเดตสำเร็จ
- [ ] ปุ่ม "Save Changes" disabled เมื่อ form ไม่มีการแก้ไข (`!isDirty`)
- [ ] กด "+ Add Question" → QuestionEditor ปรากฏด้านล่าง
- [ ] เพิ่ม question ใหม่ — ปรากฏใน list
- [ ] กด "Edit" บน question → QuestionEditor เปิดพร้อม pre-fill ข้อมูลเดิม
- [ ] แก้ question แล้วบันทึก — list อัปเดต
- [ ] กด "Delete" บน question — ลบออกจาก list
- [ ] ไม่สามารถเปิด editor 2 อันพร้อมกัน (ปุ่ม disabled ขณะมี editor เปิดอยู่)
- [ ] `npm run build` ผ่าน

## Notes

- `useFieldArray` ใช้ `{ value: string }` object แทน `string` เปล่าเพราะ RHF ต้องการ object ใน array
- `params` ใน Next.js App Router ต้องใช้ `await params` (Next.js 15+)
- `editingId !== null` disable ปุ่ม Edit/Add ทั้งหมดขณะมี editor เปิดอยู่ ป้องกัน state ซ้อนกัน
- Server Component (`page.tsx`) fetch + auth check, Client Component (`QuizEditor`) handle interaction — pattern ที่ถูกต้องสำหรับ App Router
