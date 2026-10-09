import type { Session } from '@sand/sessions-sqlite/contract'
import type { SettingsPatch } from '../contract'
import { describe, modelOf, resolve } from '../effective'
import type { Tools } from './context'

export interface ApplyOptions {
  asDefault?: boolean
  quiet?: boolean
}

const cleared = (patch: SettingsPatch): SettingsPatch => Object.fromEntries(Object.keys(patch).map(key => [key, null]))

const fastModels = ({ ctx }: Tools) => (ctx.llm?.models?.() ?? []).filter(model => model.fast).map(model => model.label)

const caveat = (tools: Tools, patch: SettingsPatch, session?: Session) => {
  const current = tools.choices.state(session)
  const shown = current.next ?? current.current
  const label = modelOf(tools.ctx.llm, shown.model)?.label ?? shown.model
  if (patch.effort && !shown.supportsEffort) return ` ${label} has no effort setting, so your choice is kept for other models.`
  if (patch.speed === 'fast' && !shown.supportsFast) return ` Fast mode only works on ${fastModels(tools).join(', ') || 'some models'}, so it is kept for those.`
  return ''
}

const saveAsDefault = async (tools: Tools, patch: SettingsPatch, quiet?: boolean) => {
  const { ctx, choices, defaults } = tools
  await defaults.save(patch)
  ctx.emit('modelSettings.defaults')
  const session = ctx.ui.session()
  if (session) choices.change(session, cleared(patch))
  else ctx.ui.prepare?.(cleared(patch))
  if (quiet) return
  const next = resolve({}, defaults.get(), ctx.llm)
  ctx.ui.notify(`${describe(next, ctx.llm)} is now your default for new threads.`)
}

export const applyChoice = async (tools: Tools, patch: SettingsPatch, { asDefault, quiet }: ApplyOptions = {}) => {
  const { ctx, choices } = tools
  if (asDefault) return saveAsDefault(tools, patch, quiet)
  const session = ctx.ui.session()
  if (!session) {
    ctx.ui.prepare?.(patch)
    if (!quiet) ctx.ui.notify('Saved for your next new thread.')
    return
  }
  const timing = choices.change(session, patch)
  if (quiet) return
  const { current, next } = choices.state(session)
  const note = caveat(tools, patch, session)
  if (timing === 'next') ctx.ui.notify(`A turn is running. The next turn uses ${describe(next ?? current, ctx.llm)}.${note}`)
  else ctx.ui.notify(`Using ${describe(current, ctx.llm)} for this thread.${note}`)
}

export const saveChoices = async (tools: Tools, quiet?: boolean) => {
  const { ctx, choices, defaults } = tools
  const session = ctx.ui.session()
  if (!session) throw new Error('Open a thread first, or name the model: /model <name> --default')
  const { current, next } = choices.state(session)
  const shown = next ?? current
  const fallback = defaults.get()
  const speed = shown.chosen.speed ?? fallback.speed
  await saveAsDefault(
    tools,
    { model: shown.model ?? null, effort: shown.chosen.effort ?? fallback.effort ?? null, speed: speed === 'fast' ? 'fast' : null },
    quiet,
  )
}
