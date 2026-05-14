export type QuizSet = {
  id:          string
  title:       string
  description: string | null
  questions:   Question[]
  createdAt:   Date
}

export type Question = {
  id:            string
  text:          string
  choices:       string[]
  correctIndex:  number
  timeLimitSecs: number
  order:         number
}
