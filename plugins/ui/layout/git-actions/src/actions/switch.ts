import type { Model } from '../model'
import { messages } from './messages'
import { sendMessage, type ActionContext } from './send'

export const switchBranch = async (ctx: ActionContext, model: Model) => {
  const picker = ctx.picker
  if (!picker) return
  const { cwd, device } = model.target()
  const current = model.status.get()?.branch
  const names = await ctx.gitStatus.locals(cwd, device)
  const items = names.map(name => ({ label: name, value: name, ...(name === current && { detail: 'current' }) }))
  const picked = await picker.choose('Switch branch', items, { empty: 'No local branches' })
  if (picked?.value && picked.value !== current) await sendMessage(ctx, messages.switchTo(picked.value))
}
