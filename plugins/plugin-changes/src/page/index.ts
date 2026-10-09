import { div } from '@sand/dom'
import type { PluginSource } from '../source'
import { changesSection } from './changes'
import { installedSection } from './installed'

export const pluginsPage = (source: PluginSource): HTMLElement => div({ class: 'flex flex-col gap-6' }, changesSection(source), installedSection(source))
