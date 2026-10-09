import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import { parsePairLink } from '@sand/kit'
import type { FlowContext } from './types'

const looksLikeLink = (value: string) => Boolean(parsePairLink(value))

const connectPage = (ctx: FlowContext): PalettePage => ({
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
      const machine = await ctx.machines.add(value.trim())
      ctx.notify?.push(`Connected ${machine.name}`)
    },
  },
})

export const connectItem = (ctx: FlowContext, group?: string): PaletteItem => ({
  id: 'machine:connect',
  group,
  icon: 'plus',
  label: 'Connect another PC',
  search: 'connect pair remote pc add environment',
  page: () => connectPage(ctx),
})
