import { sig } from '@sand/dom'
import type { WireRequestOf } from '@sand/protocol'
import type { Context } from 'drydock'
import type { GithubFound, GithubState } from '../contract'

export type GithubRequest = WireRequestOf<'github.status' | 'github.use' | 'github.start' | 'github.cancel' | 'github.logout'>

export const githubControl = (ctx: Context<'wire'>, fail: (error: unknown) => void) => {
  const state = sig<GithubState | undefined>(undefined)

  ctx.on('wire.event', event => {
    if (event.name === 'github.change') state.set(event.args[0] as GithubState)
  })

  const run = async (request: GithubRequest) => {
    try {
      state.set(await ctx.wire.call<GithubState>(request))
      return true
    } catch (error) {
      fail(error)
      return false
    }
  }

  return {
    state,
    run,
    load: () => ctx.wire.call<GithubState>({ type: 'github.status' }).then(value => state.set(value), () => {}),
    find: () => ctx.wire.call<GithubFound>({ type: 'github.find' }).catch((): GithubFound => ({})),
  }
}

export type GithubControl = ReturnType<typeof githubControl>
