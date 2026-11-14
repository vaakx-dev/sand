import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { transfers } from '@sand/transfers/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { helloVoice, voiceChanged, voiceState, voiceTranscribe, voiceUse, voiceWarm } from '../contract'
import { createVoice } from './voice'

export default definePlugin({
  name: 'voice',
  description: 'Turns speech recorded in the composer into text, on this PC with Parakeet or with a cloud service the user picked. Off until the user chooses one',
  inject: { paths, transfers },
  async apply(ctx) {
    const voice = await createVoice({
      folder: join(ctx.paths.home, 'voice'),
      transfers: ctx.transfers,
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
