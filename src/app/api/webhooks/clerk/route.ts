import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  let evt
  try {
    evt = await verifyWebhook(req)
  } catch {
    return new Response('Invalid webhook signature', { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    await prisma.user.create({
      data: {
        clerkId: id,
        email:   email_addresses[0].email_address,
        name:    `${first_name ?? ''} ${last_name ?? ''}`.trim() || 'User',
      },
    })
  }

  return new Response('OK', { status: 200 })
}
