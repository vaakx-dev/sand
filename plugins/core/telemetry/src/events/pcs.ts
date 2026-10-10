import type { RemoteRecord } from '@sand/host-remotes/contract'
import { callPeer, PeerError, remoteStore } from '@sand/kit/host'
import type { Context } from 'drydock'
import type { Capture } from '../capture'
import { isId, personId, savePersonId } from '../identity'

const checkEvery = 30 * 60_000
const timeout = 10_000

export const watchPcs = (ctx: Context, capture: Capture, home: string, install: string) => {
  const sockets = new Set<WebSocket>()
  let reported = ''

  ctx.watch('hub', hub => hub?.handle('telemetry.person', () => personId(home, install)))

  const askOne = (remote: RemoteRecord) =>
    callPeer(remote, { type: 'telemetry.person' }, sockets, timeout).then(
      person => ({ reached: true, person }),
      error => ({ reached: error instanceof PeerError && error.state === 'failed', person: undefined }),
    )

  const ask = async () => {
    const remotes = (await remoteStore(home)).list()
    const answers = await Promise.all(remotes.map(askOne))
    return {
      pcs: remotes.length + 1,
      reachable: answers.filter(answer => answer.reached).length + 1,
      people: answers.map(answer => answer.person).filter(isId),
    }
  }

  const check = async () => {
    const own = await personId(home, install)
    const { pcs, reachable, people } = await ask()
    const shared = [own, ...people].sort()[0]!
    if (shared !== own) await savePersonId(home, shared)
    const summary = `${pcs}/${reachable}`
    if (summary === reported) return
    reported = summary
    capture('pcs.linked', { pcs, reachable })
  }

  const run = () => void check().catch(error => ctx.report(error))
  ctx.effect(() => {
    run()
    const timer = setInterval(run, checkEvery)
    return () => {
      clearInterval(timer)
      for (const socket of sockets) socket.close()
      sockets.clear()
    }
  })
}
