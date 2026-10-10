import { sig } from '@sand/dom'
import type { WireRequestOf } from '@sand/protocol'
import type { Context } from 'drydock'
import type { GithubFound, GithubState } from '../contract'

type GithubRequest = WireRequestOf<'github.status' | 'github.use' | 'github.start' | 'github.cancel' | 'github.logout'>

export const githubControl = (ctx: Context<'wire'>, fail: (error: unknown) => void) => {
  const state = sig<GithubState | undefined>(undefined)

  ctx.on('wire.event', event => {
    if (event.name === 'github.change') state.set(event.args[0])
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

  const find = async () => {
    try {
      return await ctx.wire.call<GithubFound>({ type: 'github.find' })
    } catch (error) {
      fail(error)
      return undefined
    }
  }

  return { state, run, find, load: () => run({ type: 'github.status' }) }
}

export type GithubControl = ReturnType<typeof githubControl>
