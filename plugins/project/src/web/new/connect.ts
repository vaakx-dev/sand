import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import { parsePairLink } from '@sand/host-remotes/pairing'
import type { ProjectsContext } from '../context'

const looksLikeLink = (value: string) => Boolean(parsePairLink(value))

const connectPage = (ctx: ProjectsContext): PalettePage => ({
  id: 'connect',
  title: 'Connect another PC',
  empty: value =>
    value.trim() && !looksLikeLink(value)
      ? 'That isn’t a pairing link. On the other PC open Devices > Pair a new device and copy its link.'
      : 'On the other PC, open Devices > Pair a new device and copy its link.',
  field: {
    kind: 'url',
    value: '',
    placeholder: 'Pairing link from the other PC',
    action: value => ({ label: 'Connect', enabled: looksLikeLink(value) }),
    async submit(value) {
      await ctx.machines.add(value.trim())
    },
  },
})

export const connectItem = (ctx: ProjectsContext, group?: string): PaletteItem => ({
  id: 'machine:connect',
  group,
  icon: 'plus',
  label: 'Connect another PC',
  search: 'connect pair remote pc add environment',
  page: () => connectPage(ctx),
})
