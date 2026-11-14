import { serial } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'
import { z } from 'zod'
import { type Theme, type ThemeAction, themeSchema, type ThemeState, trialMs } from '../contract'
import { safeCss } from '../css'

const saved = z.object({
  theme: themeSchema().nullable(),
  updated: z.number(),
  trial: z.object({ id: z.string(), previous: themeSchema().nullable(), until: z.number() }).optional(),
})

const empty: ThemeState = { theme: null, updated: 0 }

const load = async (file: string): Promise<ThemeState> => {
  const found = Bun.file(file)
  if (!(await found.exists())) return empty
  const parsed = saved.safeParse(await found.json().catch(() => undefined))
  if (parsed.success) return parsed.data
  console.error(`themes: ${file} is unreadable, so sand starts with its own look`)
  return empty
}

const cleaned = (theme: Theme): Theme => (theme.css === undefined ? theme : { ...theme, css: safeCss(theme.css) })

export interface Kept {
  theme: Theme | null
  updated: number
}

export interface ThemesOptions {
  changed(state: ThemeState): void
  kept(state: Kept): void
  trialMs?: number
}

export const keptOf = ({ theme, updated, trial }: ThemeState): Kept => ({ theme: trial ? trial.previous : theme, updated })

export const createThemes = async (file: string, { changed, kept, trialMs: trialFor = trialMs }: ThemesOptions) => {
  let state = await load(file)
  let timer: ReturnType<typeof setTimeout> | undefined
  const queue = serial()

  const schedule = () => {
    clearTimeout(timer)
    const trial = state.trial
    if (trial) timer = setTimeout(() => void decide(trial.id, false), Math.max(0, trial.until - Date.now()))
  }

  const commit = async (next: ThemeState, share: boolean) => {
    state = next
    schedule()
    await queue(() => writeAtomic(file, JSON.stringify(state)))
    changed(state)
    if (share) kept(keptOf(state))
    return state
  }

  const keep = (theme: Theme | null) => commit({ theme, updated: Date.now() }, true)

  const tryOut = (theme: Theme) => {
    const previous = state.trial ? state.trial.previous : state.theme
    return commit({ theme, updated: state.updated, trial: { id: crypto.randomUUID(), previous, until: Date.now() + trialFor } }, false)
  }

  async function decide(id: string, keepIt: boolean) {
    const trial = state.trial
    if (trial?.id !== id) return state
    if (keepIt) return keep(state.theme)
    return commit({ theme: trial.previous, updated: state.updated }, false)
  }

  const act = (action: ThemeAction, theme: Theme | undefined, trial: boolean) => {
    if (action === 'read') return Promise.resolve(state)
    if (action === 'reset') return keep(null)
    if (!theme) throw new Error('Pass the theme to set')
    return trial ? tryOut(cleaned(theme)) : keep(cleaned(theme))
  }

  const extend = (id: string) => {
    const trial = state.trial
    if (trial?.id !== id) return Promise.resolve(state)
    return commit({ ...state, trial: { ...trial, until: Date.now() + trialFor } }, false)
  }

  const take = async (incoming: Kept) => {
    if (incoming.updated <= state.updated) return keptOf(state)
    await commit({ theme: incoming.theme && cleaned(incoming.theme), updated: incoming.updated }, false)
    return keptOf(state)
  }

  if (state.trial && state.trial.until <= Date.now()) state = { theme: state.trial.previous, updated: state.updated }
  schedule()

  return {
    state: () => state,
    act,
    decide,
    extend,
    take,
    stop: () => clearTimeout(timer),
  }
}

export type Themes = Awaited<ReturnType<typeof createThemes>>
