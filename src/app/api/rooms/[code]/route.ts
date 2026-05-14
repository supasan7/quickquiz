import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const room = await prisma.room.findUnique({
    where:  { code },
    select: { code: true, status: true },
  })

  if (!room || room.status !== 'LOBBY') {
    return NextResponse.json({ error: 'Room not found or unavailable' }, { status: 404 })
  }

  return NextResponse.json({ code: room.code, status: room.status })
}
