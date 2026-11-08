import type { Kit, Tone } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import type { Pull, PullState } from '../contract'

const tones: Record<PullState, Tone> = { open: 'success', merged: 'merged', draft: 'neutral', closed: 'neutral' }

export const pullsView = (kit: Kit, pulls: Pull[]) =>
  pulls.length ? kit.monoMeta(...pulls.map(pull => span({ class: kit.toneText[tones[pull.state]], title: pull.title }, `#${pull.number}`))) : null
