import { apiKeys } from '@sand/accounts/contract'
import { sandConfig } from '@sand/config/contract'
import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { transfers } from '@sand/transfers/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { defaultCloudModel, destinations, helloVoice, voiceChanged, voiceState, voiceTranscribe, voiceUse, voiceWarm } from '../contract'
import { createVoice } from './voice'

const TABLE = ['plugins', 'voice']

export default definePlugin({
  name: 'voice',
  description: 'Turns speech recorded in the composer into text, on this PC with Parakeet or with the OpenAI key from Accounts. Off until the user chooses one',
  inject: { paths, transfers, sandConfig },
  config: z
    .object({ destination: z.enum(destinations).default('off'), model: z.string().min(1).default(defaultCloudModel) })
    .default({ destination: 'off', model: defaultCloudModel }),
  async apply(ctx, settings) {
    const voice = await createVoice({
      folder: join(ctx.paths.home, 'voice'),
      transfers: ctx.transfers,
      settings,
      save: next => ctx.sandConfig.set(TABLE, { ...next }),
      openaiKey: () => ctx.get(apiKeys)?.key('openai'),
      changed: state => ctx.get(server)?.broadcast(voiceChanged, state),
    })
    ctx.effect(() => voice.stop)
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.hello(helloVoice, () => voice.state()),
            found.handle(voiceState, () => voice.state()),
            found.handle(voiceUse, choice => voice.use(choice)),
            found.handle(voiceWarm, () => voice.warm()),
            found.handle(voiceTranscribe, upload => voice.transcribe(upload)),
          )
        : undefined,
    )
  },
})
