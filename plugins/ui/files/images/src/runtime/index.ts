import { server as serverService } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { decoderRoute } from '../contract'
import { decoderResponse } from './build'

export default definePlugin({
  name: 'file-images',
  description: 'Builds and serves the workers that decode TIFF and HEIC images for the file viewer',
  apply(ctx) {
    const respond = decoderResponse()
    ctx.watch(serverService, server => server?.route(decoderRoute, respond, { public: true }))
  },
})
