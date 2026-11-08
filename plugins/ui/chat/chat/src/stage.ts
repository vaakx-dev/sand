import { div, dynamicChild, onMount, resizeObserver, sig } from '@vaakx-dev/vrui'

interface Host {
  claim(): void
}

const laidOut = (node: HTMLElement) => node.offsetWidth > 0 && node.offsetHeight > 0

export const stage = (body: HTMLElement, composer: () => HTMLElement | undefined) => {
  const shown: Host[] = []
  const holder = sig<Host | undefined>(undefined)
  const turn = sig(0)

  dynamicChild(turn, () => composer(), body)

  const place = (host: Host) => {
    holder.set(host)
    turn.update(value => value + 1)
  }

  const hold = (host: Host) => {
    host.claim()
    place(host)
  }

  const appear = (host: Host) => {
    if (shown.includes(host)) return
    shown.push(host)
    hold(host)
  }

  const leave = (host: Host) => {
    const at = shown.indexOf(host)
    if (at < 0) return
    shown.splice(at, 1)
    const next = shown.at(-1)
    if (at === shown.length && next) hold(next)
  }

  const host = (claim: () => void) => {
    const entry: Host = { claim }
    const node = dynamicChild(
      () => holder.get() === entry,
      held => (held ? body : null),
      div({ class: 'flex min-h-0 flex-1 flex-col' }),
    )
    onMount(node, () => {
      const observer = resizeObserver(node, () => (laidOut(node) ? appear(entry) : leave(entry)))
      return () => {
        observer.disconnect()
        leave(entry)
      }
    })
    return node
  }

  const restage = () => {
    const current = shown.at(-1)
    if (current) place(current)
  }

  return { host, restage }
}

export type Stage = ReturnType<typeof stage>
