import { definePlugin } from 'drydock'
import { gitRunner } from './contract'
import { runner } from './run/runner'

export default definePlugin({
  name: 'git-runner',
  description: 'Runs git commands for other plugins',
  apply(ctx) {
    ctx.provide(gitRunner, runner)
  },
})
