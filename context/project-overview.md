# QuickQuiz — Project Overview

## What is QuickQuiz?

QuickQuiz is a real-time multiplayer quiz web app inspired by Kahoot, with an added live chat system so players can interact with each other while waiting in the lobby and between rounds. The host creates a room with a quiz set, players join via a room code, and everyone answers questions together in real time.

---

## Core Features

### Host Flow
- Create and manage quiz sets (title, description, list of questions)
- Each question has: question text, 2–4 answer choices, correct answer, and a time limit
- Create a game room linked to a quiz set
- Start, pause, and advance through rounds
- See a live leaderboard after each question

### Player Flow
- Join a room via room code (no account required — guest name entry)
- Wait in a lobby before the game starts
- Answer questions within the time limit
- See results and score after each question
- View final leaderboard at the end

### Chat System
- Live chat available in the lobby (before game starts)
- Players can send messages; all players in the room see them in real time
- Optional: keep chat available between questions during the game

### Room & Session Management
- Rooms are ephemeral — they exist for one game session
- Room code is short and human-readable (e.g. `XQZT7`)
- Host can kick players from the lobby
- Room closes automatically when the game ends or the host leaves

---

## Tech Stack

### Core (already set up)
| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Runtime | Node.js |

### Recommended Additions

#### UI Components
- **shadcn/ui** — accessible, unstyled-by-default components that work with Tailwind v4
  - Install: `npx shadcn@latest init`

#### Database
- **PostgreSQL** via **Neon** (free tier, serverless, hosted) — stores users, quiz sets, questions
- **Prisma ORM** — type-safe queries, migrations
  - Install: `npm install prisma @prisma/client @neondatabase/serverless`

#### Authentication
- **Clerk** — easiest auth setup with Next.js App Router; handles sign-up/sign-in UI, sessions, and webhooks
  - Install: `npm install @clerk/nextjs`
  - Hosts (quiz creators) must be signed in; players join as guests

#### Real-Time (Chat + Game Sync)
- **Pusher** (Channels) — serverless-friendly pub/sub; works with Next.js API routes without a custom server
  - Install: `npm install pusher pusher-js`
  - Free tier: 200k messages/day, 100 concurrent connections
  - Used for: lobby chat, player join/leave events, question reveal, answer sync, leaderboard updates

#### Validation
- **Zod** — runtime schema validation for API inputs and form data
  - Install: `npm install zod`

#### Forms
- **React Hook Form** — performant form management with Zod integration
  - Install: `npm install react-hook-form @hookform/resolvers`

---

## Architecture

```
src/
├── app/
│   ├── (auth)/                  # Clerk auth pages (sign-in, sign-up)
│   ├── (dashboard)/             # Host dashboard — requires auth
│   │   ├── dashboard/page.tsx   # List of my quiz sets
│   │   ├── quiz/
│   │   │   ├── new/page.tsx     # Create quiz set
│   │   │   └── [id]/page.tsx    # Edit quiz set
│   │   └── room/
│   │       └── [code]/page.tsx  # Host game view
│   ├── play/
│   │   ├── page.tsx             # Enter room code
│   │   └── [code]/
│   │       ├── lobby/page.tsx   # Player lobby + chat
│   │       └── game/page.tsx    # In-game answer screen
│   ├── api/
│   │   ├── rooms/route.ts       # Create/get room
│   │   ├── rooms/[code]/route.ts
│   │   └── pusher/auth/route.ts # Pusher channel auth
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── quiz/                # QuizCard, QuestionEditor, etc.
│   ├── room/                # Lobby, PlayerList, ChatBox, etc.
│   └── game/                # QuestionDisplay, Timer, AnswerButtons, Leaderboard
├── actions/
│   ├── quiz.ts              # CRUD for quiz sets
│   └── room.ts              # Create room, start game
├── lib/
│   ├── pusher.ts            # Pusher server client
│   ├── pusher-client.ts     # Pusher browser client
│   └── prisma.ts            # Prisma client singleton
└── types/
    ├── quiz.ts
    └── room.ts
```

---

## Data Models (Prisma)

```prisma
model User {
  id        String      @id @default(cuid())
  clerkId   String      @unique
  name      String
  email     String      @unique
  quizSets  QuizSet[]
  createdAt DateTime    @default(now())
}

model QuizSet {
  id          String     @id @default(cuid())
  title       String
  description String?
  hostId      String
  host        User       @relation(fields: [hostId], references: [id])
  questions   Question[]
  rooms       Room[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Question {
  id            String    @id @default(cuid())
  quizSetId     String
  quizSet       QuizSet   @relation(fields: [quizSetId], references: [id])
  text          String
  choices       Json      // string[]
  correctIndex  Int
  timeLimitSecs Int       @default(20)
  order         Int
}

model Room {
  id          String    @id @default(cuid())
  code        String    @unique   // e.g. "XQZT7"
  quizSetId   String
  quizSet     QuizSet   @relation(fields: [quizSetId], references: [id])
  status      RoomStatus @default(LOBBY)
  currentQ    Int       @default(0)
  players     Player[]
  createdAt   DateTime  @default(now())
}

model Player {
  id       String  @id @default(cuid())
  roomId   String
  room     Room    @relation(fields: [roomId], references: [id])
  name     String  // guest name
  score    Int     @default(0)
}

enum RoomStatus {
  LOBBY
  ACTIVE
  FINISHED
}
```

---

## Pusher Channel Design

| Channel | Type | Events |
|---|---|---|
| `presence-room-{code}` | Presence | `player-joined`, `player-left`, `chat-message`, `game-start` |
| `room-{code}` | Public | `question-revealed`, `timer-tick`, `round-result`, `leaderboard`, `next-question`, `end-game` |

---

## Key Pages & UX Flow

```
/ (landing)
    ↓ Enter room code → /play/[code]/lobby
    ↓ Sign in → /dashboard

/dashboard
    → Create/edit quiz sets
    → Click "Start Game" → creates Room → /room/[code]

/play/[code]/lobby
    → Enter guest name → join room via Pusher presence channel
    → Chat with other players
    → When host starts → redirect to /play/[code]/game

/play/[code]/game
    → See question + 4 answer buttons
    → Tap answer → locked in, show waiting state
    → Timer expires → show correct answer + points earned
    → After all questions → final leaderboard

/room/[code] (host view)
    → See player list + lobby chat (read-only)
    → Click "Start" → broadcasts game start
    → Controls: Next Question, End Game
    → See live answer counts per option
```

---

## Environment Variables

```env
# Neon PostgreSQL
DATABASE_URL=        # postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Pusher
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
```

---

## Development Roadmap

### Phase 0 — Foundation `(setup, no user-facing features)`
> ทำครั้งเดียวตอนเริ่มโปรเจค

- [ ] ติดตั้ง dependencies: Prisma, `@neondatabase/serverless`, Clerk, Pusher, shadcn/ui, Zod, React Hook Form
- [ ] ตั้งค่า Neon DB + `.env`
- [ ] ตั้งค่า Clerk (sign-in/sign-up pages, middleware)
- [ ] ตั้งค่า Pusher client/server
- [ ] เขียน Prisma schema (User, QuizSet, Question, Room, Player)
- [ ] รัน migration ครั้งแรก

---

### Phase 1 — Quiz Management `MVP`
> Host สร้างและจัดการชุดคำถามได้

- [ ] Dashboard — แสดงรายการ quiz sets ของ host
- [ ] สร้าง quiz set (title, description)
- [ ] เพิ่ม / แก้ไข / ลบ questions (text, 4 choices, correct answer, time limit)
- [ ] ลบ quiz set

**เส้นทาง:** `/dashboard` → `/quiz/new` → `/quiz/[id]`

---

### Phase 2 — Room & Lobby `MVP`
> Host เปิดห้อง, Player เข้าร่วมและแชทในล็อบบี้ได้

- [ ] Host สร้างห้องจาก quiz set → ได้รหัสห้อง
- [ ] Player กรอกรหัสห้อง → กรอกชื่อ → เข้าล็อบบี้
- [ ] Player list real-time ผ่าน Pusher presence channel
- [ ] **Lobby chat** — ส่ง/รับข้อความ real-time
- [ ] Host เห็นรายชื่อผู้เล่นและแชท (read-only)
- [ ] Host กด "Start Game" → broadcast ไปทุก client

**เส้นทาง:** `/play` → `/play/[code]/lobby` | `/room/[code]`

---

### Phase 3 — Game Loop `MVP`
> เล่นเกมได้ครบ loop: คำถาม → ตอบ → ผล → leaderboard

- [ ] แสดงคำถาม + countdown timer (sync ทุก client)
- [ ] Player เลือกคำตอบ → lock in → รอผล
- [ ] เมื่อ timer หมด → เฉลยคำตอบ + คะแนนที่ได้
- [ ] Host กด "Next Question" → ไปข้อถัดไป
- [ ] หลังข้อสุดท้าย → แสดง final leaderboard
- [ ] Host กด "End Game" → ปิดห้อง

---

### Phase 4 — Polish `ทำหลัง MVP`
> UX ที่ดีขึ้น แต่ไม่บล็อก core loop

- [ ] Host kick player จากล็อบบี้
- [ ] Score animation เมื่อเฉลยคำตอบ
- [ ] Screen transitions ที่ smooth
- [ ] Rejoin room เมื่อ connection หลุด
- [ ] Room หมดอายุอัตโนมัติหลังเกมจบ

---

## Non-Goals (out of scope for now)

- Mobile app
- Public quiz library / discovery feed
- Spectator mode
- Team mode
- Custom themes per quiz
- Audio/video integration
