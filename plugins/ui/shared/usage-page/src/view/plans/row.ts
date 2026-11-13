import { leftOf, percent } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'
import { accountName } from '../../data/plans'
import { limitBar, type Segment, TONE_TEXT } from './bar'
import { type Tone, toneOf, whenText } from './pace'

interface Note {
  text: string
  tone: Tone
}

const soonest = <T>(items: T[], at: (item: T) => number | undefined) =>
  items.filter(item => at(item) !== undefined).toSorted((first, second) => (at(first) ?? 0) - (at(second) ?? 0))[0]

const subject = (segment: Segment, named: boolean) => (named ? `${accountName(segment.account)} runs` : 'you run')

const noteOf = (segments: Segment[], named: boolean): Note => {
  const runsOut = soonest(segments, segment => segment.forecast?.outAt)
  if (runsOut?.forecast?.outAt) return { text: `At this pace ${subject(runsOut, named)} out ${whenText(runsOut.forecast.outAt)}`, tone: 'ahead' }
  const out = soonest(
    segments.filter(segment => segment.window.used >= 1),
    segment => segment.window.resetsAt,
  )
  if (out?.window.resetsAt) return { text: `${named ? `${accountName(out.account)} is back` : 'Back'} ${whenText(out.window.resetsAt)}`, tone: 'even' }
  const forecast = segments.find(segment => segment.forecast)?.forecast
  if (forecast && !named) return { text: `About ${percent(forecast.leftAtReset)} left at reset ${whenText(forecast.reset)}`, tone: 'even' }
  const next = soonest(segments, segment => segment.window.resetsAt)
  return { text: next?.window.resetsAt ? `Resets ${whenText(next.window.resetsAt)}` : 'Not started', tone: 'even' }
}

const headTone = (segments: Segment[], now: number): Tone => {
  const tones = segments.map(segment => toneOf(segment.window, now, segment.forecast))
  if (tones.every(tone => tone === 'out')) return 'out'
  return tones.some(tone => tone !== 'even') ? 'ahead' : 'even'
}

const meanLeft = (segments: Segment[]) => segments.reduce((sum, segment) => sum + leftOf(segment.window), 0) / segments.length

const headline = (label: string, segments: Segment[], now: number) => {
  const named = segments.length > 1
  const note = noteOf(segments, named)
  return div(
    { class: 'flex min-w-0 shrink-0 flex-col gap-px sm:w-48' },
    span({ class: 'text-sm text-neutral-200' }, label),
    div(
      { class: 'flex items-baseline gap-1.5 tabular-nums' },
      span({ class: ['text-2xl font-semibold tracking-tight', TONE_TEXT[headTone(segments, now)]] }, percent(meanLeft(segments))),
      span({ class: 'text-sm text-neutral-500' }, 'left'),
    ),
    span({ class: ['text-xs tabular-nums', note.tone === 'ahead' ? TONE_TEXT.ahead : 'text-neutral-500'] }, note.text),
  )
}

export const windowRow = (label: string, segments: Segment[], now: number, first: boolean) =>
  div(
    { class: ['flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6', first ? '' : 'border-t border-neutral-700'] },
    headline(label, segments, now),
    limitBar(segments, now),
  )
