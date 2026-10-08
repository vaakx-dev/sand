import type { PaletteItem, PalettePage } from '@sand/protocol'
import type { FlowContext } from './types'

const looksLikeLink = (value: string) => /^https?:\/\/\S+[?&]token=\S+/.test(value.trim())

const connectPage = (ctx: FlowContext): PalettePage => ({
  id: 'connect',
  title: 'Connect another PC',
  empty: value =>
    value.trim() && !looksLikeLink(value)
      ? 'That link has no token. Copy it from Devices on the other PC.'
      : 'On the other PC, open Devices in sand and copy one of its links.',
  field: {
    kind: 'url',
    value: '',
    placeholder: 'Link from the other PC',
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
