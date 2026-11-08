import type { Kit, Tone } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import type { Pull, PullState } from '../contract'

const tones: Record<PullState, Tone> = { open: 'success', merged: 'merged', draft: 'neutral', closed: 'neutral' }

const pullView = (kit: Kit, pull: Pull) => span({ class: 'shrink-0', title: pull.title }, kit.monoMeta(span({ class: kit.toneText[tones[pull.state]] }, `#${pull.number}`)))

export const pullsView = (kit: Kit, pulls: Pull[]) => (pulls.length ? span({ class: 'flex shrink-0 gap-2' }, ...pulls.map(pull => pullView(kit, pull))) : null)
