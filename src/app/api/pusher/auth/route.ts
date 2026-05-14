import { pusher } from '@/lib/pusher'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')!
  const channel  = params.get('channel_name')!

  const authResponse = pusher.authorizeChannel(socketId, channel)
  return NextResponse.json(authResponse)
}
