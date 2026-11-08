import { draftStore } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { draftsAll, draftsRead, draftsWrite } from '../contract'

export default definePlugin({
  name: 'drafts-web',
  description: "Keeps each chat's unsent message on the server, so it follows you between devices",
  inject: { wire },
  apply(ctx) {
    ctx.provide(draftStore, {
      read: async key => (await ctx.wire.call(draftsRead, { key })) ?? undefined,
      all: () => ctx.wire.call(draftsAll, {}),
      write: (key, draft) => ctx.wire.call(draftsWrite, { key, draft: draft ?? null }),
    })
  },
})
