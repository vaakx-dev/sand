import { type PullRef, pullKey } from '@sand/github/contract'
import { pullName } from '@sand/github/look'
import { sig } from '@vaakx-dev/vrui'
import { type ReviewContext, toastId } from '../inject'

const failed = "Couldn't start the agent review"

export const agentReview = (ctx: ReviewContext) => {
  const { toasts } = ctx
  const running = sig<string[]>([])

  const starting = (ref: PullRef) => running.get().includes(pullKey(ref))

  const begin = (ref: PullRef, cwd: string, device: string) => {
    const progress = toasts.show({ tone: 'neutral', sticky: true, title: `Starting an agent review of ${pullName(ref)}…` })
    return toasts.attempt(toastId, failed, () => ctx.review.agent({ repo: ref.repo, number: ref.number, cwd }, device).finally(() => progress.dismiss()))
  }

  const start = async (ref: PullRef) => {
    if (starting(ref)) return
    const at = ctx.github.localCopy(ref.repo)
    if (!at) return toasts.error(toastId, failed, `No project on an online PC has ${ref.repo} as its remote.`)
    const key = pullKey(ref)
    running.update(keys => [...keys, key])
    const started = await begin(ref, at.cwd, at.device)
    running.update(keys => keys.filter(each => each !== key))
    if (!started) return
    toasts.show({
      id: toastId,
      tone: 'neutral',
      title: 'The agent is reviewing…',
      detail: 'It adds comments to your review.',
      actions: [{ label: 'Open thread', run: () => ctx.threads.select(started.session) }],
    })
  }

  return { starting, start }
}
