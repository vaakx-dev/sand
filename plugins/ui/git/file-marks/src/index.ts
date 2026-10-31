import { fileMarks } from '@sand/files-panel/contract'
import { gitStatusClient } from '@sand/git/contract'
import { definePlugin } from 'drydock'
import { gitFileMarks } from './marks'

export default definePlugin({
  name: 'git-file-marks',
  description: 'Marks each file in the Files panel with its uncommitted git change',
  inject: { gitStatus: gitStatusClient },
  apply(ctx) {
    ctx.provide(fileMarks, gitFileMarks(ctx.gitStatus))
  },
})
