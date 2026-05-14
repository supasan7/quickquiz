# Phase 1-3 — Dashboard Page

## Status

Not Started

## Goals

แสดง list ของ quiz sets ทั้งหมดของ host พร้อม link ไปสร้าง quiz ใหม่
เป็นหน้าแรกที่ host เห็นหลัง sign in

**Route:** `/dashboard`
**Depends on:** Phase 1-1, Phase 1-2

---

## Files to Create

| File | Action |
|---|---|
| `src/app/(dashboard)/layout.tsx` | Create |
| `src/app/(dashboard)/dashboard/page.tsx` | Create |
| `src/components/quiz/QuizCard.tsx` | Create |

---

## Tasks

### 1. Dashboard Layout

**`src/app/(dashboard)/layout.tsx`:**

```tsx
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg">QuickQuiz</Link>
        <UserButton />
      </header>
      {children}
    </div>
  )
}
```

> Layout นี้ใช้กับทุก route ใน `(dashboard)` group: `/dashboard`, `/quiz/new`, `/quiz/[id]`

---

### 2. Dashboard Page

**`src/app/(dashboard)/dashboard/page.tsx`** — Server Component:

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
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
        <Button asChild>
          <Link href="/quiz/new">+ New Quiz</Link>
        </Button>
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
```

---

### 3. QuizCard Component

**`src/components/quiz/QuizCard.tsx`:**

```tsx
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deleteQuizSet } from '@/actions/quiz'

type Props = {
  quizSet: {
    id:          string
    title:       string
    description: string | null
    updatedAt:   Date
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
        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" variant="outline">
            <Link href={`/quiz/${quizSet.id}`}>Edit</Link>
          </Button>
          <form action={deleteQuizSet.bind(null, quizSet.id)}>
            <Button size="sm" variant="destructive" type="submit">
              Delete
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Checklist

- [ ] `/dashboard` โหลดได้ ไม่มี error
- [ ] Redirect ไป `/sign-in` ถ้าไม่ได้ login
- [ ] แสดง quiz sets ของ host พร้อมจำนวน questions
- [ ] Empty state แสดงเมื่อยังไม่มี quiz set
- [ ] ปุ่ม "+ New Quiz" → ไปที่ `/quiz/new`
- [ ] ปุ่ม "Edit" → ไปที่ `/quiz/[id]`
- [ ] ปุ่ม "Delete" → ลบ quiz set + reload หน้า
- [ ] `UserButton` แสดงใน header
- [ ] `npm run build` ผ่าน

## Notes

- Dashboard fetch ตรงจาก Prisma ใน Server Component — ไม่ต้องผ่าน API route
- `select: { id: true }` ใน questions query ลด payload — ต้องการแค่จำนวน ไม่ต้องดึงทุก field
- `orderBy: { updatedAt: 'desc' }` ให้ quiz ที่แก้ล่าสุดอยู่บนสุด
