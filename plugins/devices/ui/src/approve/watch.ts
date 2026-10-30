import type { JoinRequest, PairSettled } from '@sand/devices-contract'
import { derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import { overlaySlot } from '../shared/overlay'
import type { Ui } from '../ui'
import { approveLanding } from './landing'
import { approvePrompt } from './prompt'

const outcomeVerb = { approved: 'allowed', denied: 'denied' } as const

const elsewhereText = (ui: Ui, settled: PairSettled, request: JoinRequest) => {
  if (settled.outcome === 'expired') return undefined
  const by = settled.by ? ui.data.nameOf(settled.by) : 'Another device'
  return `${by} ${outcomeVerb[settled.outcome]} ${request.name}`
}

export const approvals = (ui: Ui, adding: () => boolean) => {
  const prompt = overlaySlot(ui.ctx, 150)
  const landing = overlaySlot(ui.ctx, 160)
  const later = sig(new Set<string>())
  const approval = ui.data.changes.read(() => ui.ctx.pcs.approval())
  const paired = derive(() => ui.data.paired.get().phase === 'paired')

  const closeLanding = () => {
    landing.close()
    ui.ctx.pcs.dismissApproval()
  }

  const current = derive(() => {
    if (!paired.get() || adding() || approval.get()) return undefined
    return ui.data.requests.live(ui.data.now.get()).find(request => !later.get().has(request.id))?.id
  })

  effect(() => {
    const id = current.get()
    untrack(() => {
      const request = id ? ui.data.requests.get(id) : undefined
      if (!request) return prompt.close()
      prompt.open(() => approvePrompt(ui, request, () => later.update(all => new Set([...all, request.id]))))
    })
  })

  effect(() => {
    const id = approval.get()
    const show = paired.get()
    untrack(() => (id && show ? landing.open(() => approveLanding(ui, id, closeLanding)) : landing.close()))
  })

  effect(() =>
    ui.data.requests.onSettled((settled, request) => {
      if (approval.get() === settled.id) closeLanding()
      if (!request || ui.data.requests.decidedHere(settled.id)) return
      const text = elsewhereText(ui, settled, request)
      if (text) ui.toasts.ok(text)
    }),
  )
}
