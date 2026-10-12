import type { Stashed } from '../contract'
import type { ComposerContent } from '@sand/composer-card/contract'
import { errorMessage, oneLine } from '@sand/kit'
import type { Context } from 'drydock'
import type { Items } from './items'
import { folderName, originOf } from './origin'

type Ctx = Context<'composer' | 'threads' | 'wire'>

const quoted = (item: Stashed) => `"${oneLine(item.label, 40)}"`

const onOtherPc = (ctx: Ctx, item: Stashed) =>
  item.content.some(block => block.type === 'file') && (item.from?.device ?? '') !== (originOf(ctx).device ?? '')

const refsFolder = (ctx: Ctx, { from, text }: Stashed) =>
  from && from.cwd !== originOf(ctx).cwd && /(^|\s)@\S/.test(text) ? folderName(from.cwd) : undefined

export const createActions = (ctx: Ctx, items: Items) => {
  const tell = (text: string, run?: () => void) => ctx.notify?.push(text, run ? { action: { label: 'Undo', run } } : {})
  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
  const remove = (item: Stashed) => {
    items.drop(item.id)
    return ctx.wire.call<boolean>({ type: 'stash.remove', item: item.id })
  }
  const keep = ({ id, at, text, content, from }: Stashed) => ctx.wire.call<Stashed>({ type: 'stash.save', item: id, at, text, content, from })

  const unstash = (item: Stashed, saved: ComposerContent) =>
    remove(item).then(() => {
      ctx.composer.restore(saved)
    }, fail)

  return {
    async stash() {
      try {
        const snapshot = await ctx.composer.snapshot()
        if (!snapshot) return false
        const item = await ctx.wire.call<Stashed>({ type: 'stash.save', ...snapshot, from: originOf(ctx) })
        ctx.composer.clear()
        tell(`Stashed ${quoted(item)}`, () => void unstash(item, snapshot))
      } catch (error) {
        fail(new Error(`Couldn't stash: ${errorMessage(error)}`))
      }
      return true
    },
    putBack(item: Stashed) {
      if (onOtherPc(ctx, item)) return void tell(`${quoted(item)} has files on another PC. Put it back in a thread on that PC.`)
      ctx.composer.restore(item)
      void remove(item).catch(fail)
      const folder = refsFolder(ctx, item)
      if (folder) tell(`The @refs in ${quoted(item)} point into ${folder}`)
    },
    discard(item: Stashed) {
      void remove(item).then(() => tell(`Deleted ${quoted(item)}`, () => void keep(item).catch(fail)), fail)
    },
  }
}

export type Actions = ReturnType<typeof createActions>
