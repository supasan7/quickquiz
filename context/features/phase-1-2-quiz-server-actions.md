# Phase 1-2 — Quiz Server Actions

## Status

Not Started

## Goals

สร้าง Server Actions สำหรับ CRUD ทั้งหมดของ quiz sets และ questions
ทุก action ต้อง auth-gated และ verify ownership ก่อน mutation

**Depends on:** Phase 1-1 (ต้องมี `User` record ใน DB)

---

## Files to Create

| File | Action |
|---|---|
| `src/actions/quiz.ts` | Create |

---

## Tasks

### สร้าง `src/actions/quiz.ts`

```ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ─── Schemas ────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────

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
}

export async function updateQuizSet(id: string, formData: FormData) {
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
}

export async function deleteQuizSet(id: string) {
  const user = await getDbUser()
  await assertOwnsQuizSet(id, user.id)
  await prisma.quizSet.delete({ where: { id } })
  revalidatePath('/dashboard')
  return { success: true as const }
}

// ─── Question Actions ─────────────────────────────────────────

export async function upsertQuestion(
  quizSetId: string,
  data: z.infer<typeof QuestionSchema> & { id?: string }
) {
  const user = await getDbUser()
  await assertOwnsQuizSet(quizSetId, user.id)

  const parsed = QuestionSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() }

  const question = data.id
    ? await prisma.question.update({ where: { id: data.id }, data: parsed.data })
    : await prisma.question.create({ data: { ...parsed.data, quizSetId } })

  revalidatePath(`/quiz/${quizSetId}`)
  return { success: true as const, data: question }
}

export async function deleteQuestion(quizSetId: string, questionId: string) {
  const user = await getDbUser()
  await assertOwnsQuizSet(quizSetId, user.id)
  await prisma.question.delete({ where: { id: questionId } })
  revalidatePath(`/quiz/${quizSetId}`)
  return { success: true as const }
}
```

---

## Action Summary

| Action | Input | Description |
|---|---|---|
| `createQuizSet(formData)` | title, description? | สร้าง quiz set ใหม่ |
| `updateQuizSet(id, formData)` | title, description? | แก้ title/description |
| `deleteQuizSet(id)` | — | ลบ quiz set + questions (cascade) |
| `upsertQuestion(quizSetId, data)` | id? + question fields | สร้างหรือแก้ไข question |
| `deleteQuestion(quizSetId, questionId)` | — | ลบ question |

---

## Checklist

- [ ] `src/actions/quiz.ts` สร้างแล้ว
- [ ] `createQuizSet` ทำงานได้ (ทดสอบผ่าน Phase 1-4)
- [ ] `updateQuizSet` ทำงานได้ (ทดสอบผ่าน Phase 1-5)
- [ ] `deleteQuizSet` ทำงานได้ (ทดสอบผ่าน Phase 1-3)
- [ ] `upsertQuestion` สร้างและแก้ไข question ได้ (ทดสอบผ่าน Phase 1-5)
- [ ] `deleteQuestion` ทำงานได้ (ทดสอบผ่าน Phase 1-5)
- [ ] User ที่ไม่ใช่เจ้าของไม่สามารถ mutate quiz set ของคนอื่นได้
- [ ] `npm run build` ผ่าน

## Notes

- `as const` บน `success` ทำให้ TypeScript discriminate union ได้ถูกต้อง (`result.success === true` → `result.data` มี type)
- `assertOwnsQuizSet` ยิง query เพิ่ม 1 ครั้งต่อ mutation — acceptable สำหรับ scale นี้
- cascade delete ของ questions ทำโดย Prisma schema (`onDelete: Cascade`) ไม่ต้องลบเองใน action
