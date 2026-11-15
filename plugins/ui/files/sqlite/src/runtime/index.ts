import { server as serverService } from '@sand/server/contract'
import { libraryFiles } from '@sand/util/host'
import { definePlugin } from 'drydock'
import { sqliteRoute } from '../contract'

const SERVED = ['dist/worker.sql-wasm.js', 'dist/sql-wasm.wasm']

export default definePlugin({
  name: 'file-sqlite',
  description: "Serves sql.js's worker and WebAssembly engine to the page's SQLite viewer",
  apply(ctx) {
    const respond = libraryFiles({ route: sqliteRoute, library: 'sql.js', files: SERVED, from: import.meta.dir })
    ctx.watch(serverService, server => server?.route(sqliteRoute, respond, { public: true }))
  },
})
