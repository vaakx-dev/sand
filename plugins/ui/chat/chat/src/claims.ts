import { onMount, resizeObserver } from '@vaakx-dev/vrui'

type Claim = () => void

export const claims = () => {
  const shown: Claim[] = []

  const appear = (claim: Claim) => {
    if (shown.includes(claim)) return
    shown.push(claim)
    claim()
  }

  const leave = (claim: Claim) => {
    const at = shown.indexOf(claim)
    if (at < 0) return
    shown.splice(at, 1)
    if (at === shown.length) shown.at(-1)?.()
  }

  return (node: HTMLElement, claim: Claim) =>
    onMount(node, () => {
      const observer = resizeObserver(node, () => (node.offsetWidth > 0 ? appear(claim) : leave(claim)))
      return () => {
        observer.disconnect()
        leave(claim)
      }
    })
}

export type Claims = ReturnType<typeof claims>
