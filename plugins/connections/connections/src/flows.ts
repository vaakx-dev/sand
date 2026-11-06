import { errorMessage } from '@sand/util'
import type { Account, Client, FlowEnd, OAuth } from './contract'
import { authorizeUrl, bearer, challengeOf, exchange, randomText } from './oauth'
import type { Tokens } from './vault'

export interface Login {
  oauth: OAuth
  client: Client
  readOnly: boolean
  connect(name: string, tokens: Tokens): Promise<Account>
}

type Outcome = Omit<FlowEnd, 'flow'>

const timeout = 10 * 60_000

const page = ({ account, error }: Outcome) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><title>sand</title><p style="font:16px system-ui;margin:3rem">${Bun.escapeHTML(
      account ? `Connected ${account.name}. You can close this tab.` : `Couldn't connect: ${error}`,
    )}</p>`,
    { status: account ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )

export const createFlows = (ended: (end: FlowEnd) => void) => {
  const running = new Map<string, (outcome?: Outcome) => void>()

  const start = async (login: Login) => {
    const flow = randomText(12)
    const verifier = randomText(32)
    const state = randomText(16)
    const controller = new AbortController()
    let answered = false

    const complete = async (params: URLSearchParams) => {
      const error = params.get('error')
      if (error) throw new Error(params.get('error_description') ?? (error === 'access_denied' ? "Access wasn't granted" : error))
      if (params.get('state') !== state) throw new Error("The sign-in answer doesn't match this sign-in")
      const code = params.get('code')
      if (!code) throw new Error('The sign-in answer has no code')
      const tokens = await exchange(login.oauth, login.client, { code, verifier, redirect }, controller.signal)
      const name = await login.oauth.identify(bearer(tokens.access), controller.signal)
      controller.signal.throwIfAborted()
      return login.connect(name, tokens)
    }

    const callback = async (request: Request) => {
      const params = new URL(request.url).searchParams
      if (!params.has('state') && !params.has('error')) return new Response('Not found', { status: 404 })
      if (answered) return page({ error: 'This sign-in already finished' })
      answered = true
      const outcome = await complete(params).then(
        (account): Outcome => ({ account }),
        (error): Outcome => ({ error: errorMessage(error) }),
      )
      finish(outcome)
      return page(outcome)
    }

    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: callback })
    const redirect = `http://${login.oauth.loopback ?? '127.0.0.1'}:${server.port}`
    const timer = setTimeout(() => finish({ error: 'Sign-in timed out' }), timeout)
    const finish = (outcome?: Outcome) => {
      if (!running.delete(flow)) return
      clearTimeout(timer)
      controller.abort()
      void server.stop()
      if (outcome) ended({ flow, ...outcome })
    }
    running.set(flow, finish)
    return { flow, url: authorizeUrl(login.oauth, login.client, { redirect, state, challenge: await challengeOf(verifier), readOnly: login.readOnly }) }
  }

  const cancel = (flow: string) => {
    const finish = running.get(flow)
    finish?.()
    return !!finish
  }

  const close = () => [...running.values()].forEach(finish => finish())

  return { start, cancel, close }
}
