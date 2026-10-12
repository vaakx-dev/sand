import type {} from '@sand/loops/contract'
import { errorMessage, noteBlock } from '@sand/kit'
import type { NoticeLevel } from '@sand/server/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'

type Move = () => Promise<string>

const tell = (session: Session, text: string) => session.append('message', { role: 'user', content: [noteBlock('sand', text)] })

export const createLater = (ctx: Context<'tools'>) => {
  const waiting = new Map<string, Move>()
  const moving = new Map<string, Promise<void>>()

  const report = (session: Session, text: string, level?: NoticeLevel) => {
    ctx.ui?.notify(text, level)
    tell(session, text)
  }

  const run = async (session: Session, move: Move) => {
    try {
      report(session, await move())
    } catch (error) {
      report(session, `Moving this thread failed: ${errorMessage(error)}`, 'error')
    }
  }

  ctx.on('turn.end', (session, result) => {
    const move = waiting.get(session.id)
    if (!move) return
    waiting.delete(session.id)
    if (result.stopReason === 'interrupted' || result.stopReason === 'error') {
      tell(session, 'The turn stopped early, so this thread was not moved.')
      return
    }
    moving.set(
      session.id,
      run(session, move).finally(() => moving.delete(session.id)),
    )
  })

  ctx.on('turn.prepare', async session => {
    await moving.get(session.id)
  })

  return (session: Session, move: Move) => void waiting.set(session.id, move)
}

export type Later = ReturnType<typeof createLater>
