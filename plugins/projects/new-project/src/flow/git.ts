import type { PalettePage } from '@sand/palette/contract'
import type { Machine } from '@sand/web-client/contract'
import { folderPage } from './folder'
import type { FlowContext, Next, Repo } from './types'

const parse = (value: string): Repo | undefined => {
  const url = value.trim()
  const name = url.replace(/\.git$/, '').split(/[/:]/).filter(Boolean).at(-1)
  return /\S+[/:]\S+/.test(url) && name ? { url, name } : undefined
}

export const gitPage = (ctx: FlowContext, machine: Machine, next: Next): PalettePage => ({
  id: 'git',
  title: 'Git URL',
  empty: value =>
    value.trim() && !parse(value) ? 'That doesn’t look like a clone URL yet.' : '',
  field: {
    kind: 'url',
    value: '',
    placeholder: 'Git clone URL',
    action: value => ({ label: 'Continue', enabled: Boolean(parse(value)) }),
    submit(value) {
      const repo = parse(value)
      return repo && folderPage(ctx, machine, next, { mode: 'clone', repo })
    },
  },
})
