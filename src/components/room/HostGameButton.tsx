'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createRoom } from '@/actions/room'

type Props = { quizSetId: string }

export default function HostGameButton({ quizSetId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleHost() {
    setLoading(true)
    const result = await createRoom(quizSetId)
    if (result.success) {
      router.push(`/room/${result.data.code}`)
    } else {
      alert(result.error)
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleHost} disabled={loading}>
      {loading ? 'Creating…' : '▶ Host Game'}
    </Button>
  )
}
