import type { PullRef } from '@sand/github/contract'
import { sig } from '@vaakx-dev/vrui'
import type { ReviewContext } from '../inject'
import { attempt, notify, notifyError } from '../notify'
import { pullName, refLabel } from '../pull/ref'

const keyOf = (ref: PullRef) => refLabel(ref).toLowerCase()

export const agentReview = (ctx: ReviewContext) => {
  const running = sig<string[]>([])

  const starting = (ref: PullRef) => running.get().includes(keyOf(ref))

  const start = async (ref: PullRef) => {
    if (starting(ref)) return
    const at = ctx.pullPage.localCopy(ref.repo)
    if (!at) return notifyError(ctx, "Couldn't start the agent review", `No project on an online PC has ${ref.repo} as its remote.`)
    const key = keyOf(ref)
    running.update(keys => [...keys, key])
    const shown = notify(ctx, { tone: 'neutral', sticky: true, title: `Starting an agent review of ${pullName(ref)}…` })
    const started = await attempt(ctx, "Couldn't start the agent review", () => ctx.review.agent({ repo: ref.repo, number: ref.number, cwd: at.cwd }, at.device))
    shown?.dismiss()
    running.update(keys => keys.filter(each => each !== key))
    if (!started) return
    notify(ctx, {
      tone: 'neutral',
      title: 'The agent is reviewing…',
      detail: 'It adds comments to your review.',
      actions: [{ label: 'Open thread', run: () => ctx.threads.select(started.session) }],
    })
  }

  return { starting, start }
}
