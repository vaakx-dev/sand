import { div, pageHead } from '@sand/dom'
import type { UpdateSource } from '../source'
import { latestSection } from './latest'
import { versionSection } from './version'

export const updatesPage = (source: UpdateSource): HTMLElement =>
  div(
    { class: 'flex flex-col gap-6' },
    pageHead('Sand looks for new versions on GitHub and installs one only when you click Update.', null),
    versionSection(source),
    latestSection(source),
  )
