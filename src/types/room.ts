export type Room = {
  id:       string
  code:     string
  status:   'LOBBY' | 'ACTIVE' | 'FINISHED'
  currentQ: number
}

export type Player = {
  id:    string
  name:  string
  score: number
}

export type ChatMessage = {
  playerId:   string
  playerName: string
  text:       string
  sentAt:     number
}
