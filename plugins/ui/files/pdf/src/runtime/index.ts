import { server as serverService } from '@sand/server/contract'
import { libraryFiles } from '@sand/util/host'
import { definePlugin } from 'drydock'
import { pdfAssetsRoute } from '../contract'

const SERVED = ['build/pdf.worker.min.mjs', 'cmaps/*.bcmap', 'standard_fonts/*.{pfb,ttf}', 'wasm/*.{wasm,js}', 'iccs/*.icc']

export default definePlugin({
  name: 'file-pdf',
  description: "Serves pdf.js's worker, fonts, character maps and image decoders to the page's PDF reader",
  apply(ctx) {
    const respond = libraryFiles({ route: pdfAssetsRoute, library: 'pdfjs-dist', files: SERVED, from: import.meta.dir })
    ctx.watch(serverService, server => server?.route(pdfAssetsRoute, respond, { public: true }))
  },
})
