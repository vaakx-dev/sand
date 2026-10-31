import type { MergeMethod, PullRef } from '@sand/github/contract'
import { pullName, pullRef } from '@sand/github/look'
import { hereOf, type PageContext, toastId } from '../inject'
import type { DetailModel } from './model'

export interface ActionDeps {
  ctx: PageContext
  select(ref: PullRef): void
}

export const pullActions = ({ ctx, select }: ActionDeps, model: DetailModel) => {
  const { github, pullDetail, toasts } = ctx
  const ref = pullRef(model.ref)
  const name = pullName(ref)

  const act = <T>(title: string, work: () => Promise<T>) => model.run(() => toasts.attempt(toastId, title, work))

  const merge = async (method: MergeMethod, auto = false) => {
    const done = await act(`Couldn't merge ${name}`, () => github.merge({ ...ref, method, auto }, hereOf(ctx)))
    model.put(done)
    if (done) toasts.show({ id: toastId, tone: 'success', title: done.state === 'merged' ? `Merged ${name}` : `${name} merges when it's ready` })
  }

  const ready = async (on: boolean) => model.put(await act(`Couldn't change ${name}`, () => github.ready({ ...ref, ready: on }, hereOf(ctx))))

  const update = async (rebase: boolean) => {
    const done = await act(`Couldn't update ${name}`, () => pullDetail.updateBranch({ ...ref, rebase }))
    model.put(done)
    if (done) toasts.show({ id: toastId, tone: 'success', title: rebase ? `Rebasing ${name} onto ${done.base}` : `Merging ${done.base} into ${name}` })
  }

  const deleteBranch = async () => model.put(await act(`Couldn't delete the branch of ${name}`, () => pullDetail.deleteBranch(ref)))

  const close = async (closed: boolean) => model.put(await act(`Couldn't ${closed ? 'close' : 'reopen'} ${name}`, () => pullDetail.close({ ...ref, closed })))

  const revert = async () => {
    const made = await act(`Couldn't revert ${name}`, () => pullDetail.revert(ref))
    if (!made) return
    toasts.show({ id: toastId, tone: 'success', title: `Opened ${pullName(made)} to revert ${name}`, actions: [{ label: 'Show', primary: true, run: () => select(pullRef(made)) }] })
  }

  const edit = async (text: { title?: string; body?: string }) => {
    const done = await act(`Couldn't save ${name}`, () => pullDetail.edit({ ...ref, ...text }))
    model.put(done)
    return Boolean(done)
  }

  const requestReview = async (add: string[]) => model.put(await act(`Couldn't request reviews on ${name}`, () => pullDetail.requestReview({ ...ref, add })))

  const reply = async (body: string, thread?: string) => {
    const done = await act(`Couldn't reply on ${name}`, () => pullDetail.reply({ ...ref, body, ...(thread && { thread }) }))
    model.put(done)
    return Boolean(done)
  }

  const resolve = async (thread: string, resolved: boolean) =>
    model.put(await act(`Couldn't ${resolved ? 'resolve' : 'reopen'} the conversation`, () => pullDetail.resolveThread({ ...ref, thread, resolved })))

  return { merge, ready, update, deleteBranch, close, revert, edit, requestReview, reply, resolve }
}

export type PullActions = ReturnType<typeof pullActions>
