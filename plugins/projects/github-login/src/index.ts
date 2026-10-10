import type { Server } from '@sand/server/contract'
import type { ShellEnv } from '@sand/tools-shell/contract'
import type {} from './contract'
import { watchRemotes } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { applyEnv } from './env'
import { createGithubLogin } from './login'
import { serveGithub } from './serve'

const syncEvery = 10 * 60_000
const firstSync = 3_000

export default definePlugin({
  name: 'github-login',
  description: 'One GitHub login for every PC: reuses or creates a gh login, shares it with paired PCs and gives agent shells GH_TOKEN for gh and git push',
  inject: ['cli'],
  uses: {
    shellEnv: 'agent shells do not get GH_TOKEN',
    server: 'no GitHub section in settings and no sharing with other PCs',
  },
  async apply(ctx) {
    const { home } = ctx.cli
    let server: Server | undefined
    let shell: ShellEnv | undefined
    let applied: string | undefined
    let unset = () => {}
    let live = true

    const applyToken = () => {
      const token = login.token()
      if (token === applied) return
      unset()
      applied = token
      unset = shell && token ? applyEnv(shell, token) : () => {}
    }

    const login = await createGithubLogin({
      home,
      changed: () => {
        if (!live) return
        applyToken()
        server?.broadcast('github.change', [login.state()])
      },
    })

    ctx.watch('shellEnv', found => {
      shell = found
      applied = undefined
      applyToken()
      return () => {
        unset()
        unset = () => {}
        shell = undefined
      }
    })

    ctx.watch('server', found => {
      server = found
      if (!found) return
      const sync = () => void login.sync()
      const stop = serveGithub(found, login)
      const unwatch = watchRemotes(home, sync)
      const first = setTimeout(sync, firstSync)
      const timer = setInterval(sync, syncEvery)
      return () => {
        server = undefined
        stop()
        unwatch()
        clearTimeout(first)
        clearInterval(timer)
      }
    })

    ctx.effect(() => () => {
      live = false
      login.dispose()
    })
  },
})
