import { stored } from '@vaakx-dev/vrui'

export const openTabs = () => {
  const saved = stored<Record<string, string[]>>('sand.bots.tabs', {})
  const of = (bot: string) => saved.get()[bot] ?? []
  const set = (bot: string, refs: string[]) => saved.update(all => ({ ...all, [bot]: refs }))
  return {
    of,
    add(bot: string, ref: string) {
      if (!of(bot).includes(ref)) set(bot, [...of(bot), ref])
    },
    close: (bot: string, ref: string) => set(bot, of(bot).filter(other => other !== ref)),
    forget: (bot: string) => saved.update(({ [bot]: _, ...rest }) => rest),
  }
}

export type OpenTabs = ReturnType<typeof openTabs>
