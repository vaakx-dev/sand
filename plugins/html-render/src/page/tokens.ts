import { sandPalette } from '@sand/dom/palette'
import { mono, sans } from '@sand/dom/tokens'

type Shade = readonly [role: string, shade: string]

interface Group {
  use: string
  colors?: Record<string, Shade>
  values?: Record<string, string>
}

const groups: Group[] = [
  { use: "the thread's background and text", colors: { '--background': ['neutral', '900'], '--foreground': ['neutral', '100'] } },
  { use: 'quiet surfaces, secondary text', colors: { '--muted': ['neutral', '800'], '--muted-foreground': ['neutral', '400'] } },
  { use: 'raised surfaces', colors: { '--card': ['neutral', '800'], '--card-foreground': ['neutral', '100'] } },
  { use: 'chips, secondary buttons', colors: { '--secondary': ['neutral', '700'], '--secondary-foreground': ['neutral', '200'] } },
  { use: 'borders and focus rings', colors: { '--border': ['neutral', '700'], '--input': ['neutral', '700'], '--ring': ['accent', '500'] } },
  { use: 'solid buttons', colors: { '--primary': ['accent', '500'], '--primary-foreground': ['neutral', '50'] } },
  { use: 'brand accent and accent-tinted surfaces', colors: { '--accent': ['accent', '400'], '--accent-foreground': ['neutral', '50'], '--accent-surface': ['accent', '950'] } },
  { use: 'positive states', colors: { '--success': ['success', '500'], '--success-foreground': ['success', '400'], '--success-surface': ['success', '950'] } },
  { use: 'warnings', colors: { '--warning': ['warning', '500'], '--warning-foreground': ['warning', '400'], '--warning-surface': ['warning', '950'] } },
  { use: 'errors and removals', colors: { '--destructive': ['danger', '500'], '--destructive-foreground': ['danger', '400'], '--destructive-surface': ['danger', '950'] } },
  { use: 'informational accents', colors: { '--info': ['sky', '400'] } },
  { use: 'code blocks', colors: { '--code-background': ['neutral', '950'], '--code-foreground': ['neutral', '200'] } },
  {
    use: 'chart series, in order',
    colors: {
      '--chart-1': ['accent', '400'],
      '--chart-2': ['sky', '400'],
      '--chart-3': ['orange', '400'],
      '--chart-4': ['success', '400'],
      '--chart-5': ['warning', '400'],
      '--chart-6': ['danger', '400'],
    },
  },
  { use: 'corner radius', values: { '--radius': '0.625rem' } },
  { use: "the app's fonts", values: { '--font-sans': sans, '--font-mono': mono } },
]

export const themeVariables = (): Record<string, string> =>
  Object.fromEntries(
    groups.flatMap(group => [
      ...Object.entries(group.colors ?? {}).map(([name, [role, shade]]) => [name, sandPalette[role]?.[shade] ?? 'currentColor']),
      ...Object.entries(group.values ?? {}),
    ]),
  )

const names = (group: Group) => [...Object.keys(group.colors ?? {}), ...Object.keys(group.values ?? {})]

export const tokenTable = () =>
  ['| Variables | Use |', '|---|---|', ...groups.map(group => `| ${names(group).map(name => `\`${name}\``).join(', ')} | ${group.use} |`)].join('\n')
