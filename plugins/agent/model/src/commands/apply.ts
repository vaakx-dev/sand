import type { EffectiveSettings, SettingsPatch } from '../contract'
import { describe, modelOf, resolve } from '../effective'
import type { Tools } from './context'

export interface ApplyOptions {
  asDefault?: boolean
  quiet?: boolean
}

const cleared = (patch: SettingsPatch): SettingsPatch => Object.fromEntries(Object.keys(patch).map(key => [key, null]))

const fastModels = ({ ctx }: Tools) => (ctx.llm?.models?.() ?? []).filter(model => model.fast).map(model => model.label)

const caveat = (tools: Tools, patch: SettingsPatch, shown: EffectiveSettings) => {
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
  ctx.ui.notify(`${describe(resolve({}, defaults.get(), ctx.llm), ctx.llm)} is now your default for new threads.`)
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
  const shown = choices.shown(session)
  const settings = describe(shown, ctx.llm)
  const note = caveat(tools, patch, shown)
  if (timing === 'next') ctx.ui.notify(`A turn is running. The next turn uses ${settings}.${note}`)
  else ctx.ui.notify(`Using ${settings} for this thread.${note}`)
}

export const saveChoices = async (tools: Tools, quiet?: boolean) => {
  const { ctx, choices, defaults } = tools
  const session = ctx.ui.session()
  if (!session) throw new Error('Open a thread first, or name the model: /model <name> --default')
  const { model, chosen } = choices.shown(session)
  const fallback = defaults.get()
  const speed = chosen.speed ?? fallback.speed
  await saveAsDefault(tools, { model: model ?? null, effort: chosen.effort ?? fallback.effort ?? null, speed: speed === 'fast' ? 'fast' : null }, quiet)
}
