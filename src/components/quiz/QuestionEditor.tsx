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
