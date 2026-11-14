import type { ImageBlock } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import type { Media } from '@sand/media/contract'
import { pageParts } from '@sand/ui-shell/contract'
import type { Tool, ToolOutput } from '@sand/tools/contract'
import { z } from 'zod'
import { sceneIds, sceneNames, starters, type Theme, themeActions, themeName, themeSchema, type ThemeState, type ThemeTrialEntry } from '../contract'
import { contrast, modeOf, paletteOf } from '../palette'
import { captureSand, type Shot } from './capture'
import type { Themes } from './themes'

const input = z.object({
  action: z.enum(themeActions).describe("read the theme, set a new one, or reset to sand's own look"),
  theme: themeSchema().optional().describe('The whole theme to set, for action set'),
})

const partList = Object.entries(pageParts)
  .map(([name, about]) => `[data-part="${name}"] (${about})`)
  .join('; ')

const description = [
  "Read, set or reset the one theme sand uses on every device and PC: a base colour and an accent that make every colour for light and dark, single colour overrides, custom CSS and an animated background behind frosted panels, calm in the middle and moving at the edges.",
  `Starters: ${starters.map(starter => `${themeName(starter.theme)}${starter.theme ? ` (base ${starter.theme.base}, accent ${starter.theme.accent}${starter.theme.scene ? `, scene ${starter.theme.scene}` : ''}${starter.theme.mode ? `, ${starter.theme.mode}` : ''})` : ''}`).join(', ')}.`,
  `Scenes: ${sceneIds.map(id => `${id} (${sceneNames[id]})`).join(', ')}.`,
  `Custom CSS can target these parts, whose names stay the same across updates: ${partList}. Colours are CSS variables like var(--vrui-color-accent-500) and var(--vrui-color-neutral-900). CSS that would load anything from the internet is stripped.`,
  'A theme you set is on at once on every device as a trial: the user sees it with Keep and Undo, and it goes back by itself about 30 seconds later unless they keep it. set returns a desktop and a phone screenshot of sand in the new theme: look at both before you reply, and set it again if text is hard to read, a panel hides the background badly or anything looks broken. Say what you checked in your reply.',
].join(' ')

const shown = ({ theme, trial }: ThemeState) => ({ theme: theme ?? "sand's own look", ...(trial && { trial: { goesBackTo: themeName(trial.previous), at: new Date(trial.until).toISOString() } }) })

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
      `${state.theme!.name} is on across sand now, phone included, as a trial. Under your reply the user gets a card with these screenshots and Keep or Undo; it goes back to ${themeName(trial.previous)} about 30 seconds after your reply unless they keep it.`,
      `Readability: ${readability(state.theme!)}.`,
      images.length ? 'Here are a desktop and a phone screenshot of it. Check both before you reply.' : '',
      ...notes,
    ]
      .filter(Boolean)
      .join(' ')
    return [{ type: 'text' as const, text }, ...images]
  },
})
