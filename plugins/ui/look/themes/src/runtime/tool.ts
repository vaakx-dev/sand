import type { ImageBlock } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import type { Media } from '@sand/media/contract'
import { pageParts } from '@sand/ui-shell/contract'
import type { Tool, ToolOutput } from '@sand/tools/contract'
import { z } from 'zod'
import { sceneIds, sceneNames, type Theme, themeActions, themeName, themeSchema, type ThemeState, type ThemeTrialEntry } from '../contract'
import { contrast, modeOf, paletteOf } from '../palette'
import { captureSand, type Shot } from './capture'
import type { Themes } from './themes'

const input = z.object({
  action: z.enum(themeActions).describe('read, set or reset'),
  theme: themeSchema().optional().describe('The whole theme, for set'),
})

const description = "Read, set or reset sand's one theme on every device. Read first for scenes and CSS parts; set starts a trial the user keeps or undoes, with screenshots to check."

const scenesGuide = Object.fromEntries(sceneIds.map(id => [id, sceneNames[id]]))

const cssGuide = { parts: Object.fromEntries(Object.entries(pageParts).map(([name, about]) => [`[data-part="${name}"]`, about])), colors: 'CSS variables like var(--vrui-color-accent-500)' }

const shown = ({ theme, trial }: ThemeState) => ({
  theme: theme ?? "sand's own look",
  ...(trial && { trial: { goesBackTo: themeName(trial.previous), at: new Date(trial.until).toISOString() } }),
  scenes: scenesGuide,
  css: cssGuide,
})

const readability = (theme: Theme) =>
  (['dark', 'light'] as const)
    .filter(mode => modeOf(theme, mode === 'light') === mode)
    .map(mode => {
      const { neutral } = paletteOf(theme, mode) as unknown as Record<'neutral', Record<string, string>>
      return `${mode}: body text ${contrast(neutral['100']!, neutral['900']!).toFixed(1)}:1 on the page, ${contrast(neutral['100']!, neutral['800']!).toFixed(1)}:1 on panels`
    })
    .join('; ')

const imageOf = (media: Media, shot: Shot): ImageBlock => ({ ...media.put(shot.png, 'image/png'), type: 'image', mediaType: 'image/png', name: `${shot.screen.name}.png` })

const pageOf = (conversation: Conversation) => `/?view=${conversation.owner}&id=${encodeURIComponent(conversation.id)}`

export type ShowCard = (conversation: Conversation, entry: ThemeTrialEntry) => void

export const themeTool = (themes: Themes, media: Media, home: string, showCard: ShowCard): Tool<typeof input> => ({
  name: 'theme',
  group: 'theme',
  description,
  input,
  effect: 'write',
  async run({ action, theme }, { conversation }): Promise<ToolOutput> {
    if (action === 'read') return JSON.stringify(shown(themes.state()))
    if (action === 'reset') {
      await themes.act('reset', undefined, false)
      return "sand is back to its own look on every device."
    }
    if (!theme) throw new Error('Pass the whole theme to set.')
    const state = await themes.act('set', theme, true)
    const trial = state.trial!
    const notes: string[] = []
    const images: ImageBlock[] = []
    try {
      for (const shot of await captureSand(home, pageOf(conversation))) images.push(imageOf(media, shot))
    } catch (error) {
      notes.push(error instanceof Error ? error.message : String(error))
    }
    await themes.extend(trial.id)
    const [desktop, phone] = images
    showCard(conversation, { trial: trial.id, theme: state.theme!, previous: trial.previous, ...(desktop && { desktop }), ...(phone && { phone }) })
    const text = [
      `${themeName(state.theme)} is on across sand now, phone included, as a trial. Under your reply the user gets a card with these screenshots and Keep or Undo; it goes back to ${themeName(trial.previous)} about 30 seconds after your reply unless they keep it.`,
      `Readability: ${readability(state.theme!)}.`,
      images.length ? 'Here are a desktop and a phone screenshot of it. Check both before you reply.' : '',
      ...notes,
    ]
      .filter(Boolean)
      .join(' ')
    return [{ type: 'text' as const, text }, ...images]
  },
})
