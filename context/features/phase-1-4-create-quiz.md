# Phase 1-4 — Create Quiz Page

## Status

Not Started

## Goals

หน้าฟอร์มสร้าง quiz set ใหม่ — กรอก title และ description แล้ว redirect ไปหน้า edit quiz

**Route:** `/quiz/new`
**Depends on:** Phase 1-2 (`createQuizSet` action)

---

## Files to Create

| File | Action |
|---|---|
| `src/app/(dashboard)/quiz/new/page.tsx` | Create |

---

## Tasks

### สร้าง Create Quiz Page

**`src/app/(dashboard)/quiz/new/page.tsx`:**

```tsx
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
```

---

## Checklist

- [ ] `/quiz/new` โหลดได้ ไม่มี error
- [ ] Submit ด้วย title ว่าง → แสดง validation error
- [ ] Submit สำเร็จ → redirect ไปที่ `/quiz/[id]` ของ quiz set ใหม่
- [ ] ปุ่ม Cancel → กลับหน้าก่อนหน้า
- [ ] ปุ่ม "← Back to Dashboard" → ไปที่ `/dashboard`
- [ ] `npm run build` ผ่าน

## Notes

- ใช้ `'use client'` เพราะต้องการ `useRouter` สำหรับ redirect หลัง submit
- ส่ง data ผ่าน `FormData` เพื่อ match signature ของ `createQuizSet` action
- ถ้า action return `success: false` ในอนาคตสามารถ handle error ด้วย toast ได้
