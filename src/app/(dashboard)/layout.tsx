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
