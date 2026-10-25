import type { Config } from '@netlify/functions'
import OpenAI from 'openai'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const MAX_MESSAGES = 20
const MAX_CHARS = 4000

export default async (req: Request) => {
  let body: { messages?: ChatMessage[] }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messages = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return Response.json({ error: 'Send at least one message' }, { status: 400 })
  }

  const openai = new OpenAI()
  const stream = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    stream: true,
    messages: [
      {
        role: 'system',
        content:
          'You are Nova, a friendly, helpful AI assistant on the Supernova website. Answer clearly and concisely. Use Markdown for code blocks and lists when it helps.',
      },
      ...messages,
    ],
  })

  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content
            if (text) controller.enqueue(encoder.encode(text))
          }
        } catch {
          controller.enqueue(encoder.encode('\n\n[Something went wrong. Please try again.]'))
        }
        controller.close()
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } },
  )
}

export const config: Config = {
  path: '/api/chat',
  method: 'POST',
}
