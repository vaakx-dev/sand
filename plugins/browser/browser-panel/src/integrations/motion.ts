const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const play = (node: Node, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
  if (!(node instanceof Element) || still()) return undefined
  const animation = node.animate(keyframes, options)
  return () => animation.cancel()
}

export const pulsing = (node: Node) =>
  play(node, [{ opacity: 1 }, { opacity: 0.3 }], { duration: 800, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' })

export const ping = (node: Node) =>
  play(node, [{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(3)', opacity: 0 }], { duration: 700, easing: 'ease-out', fill: 'forwards' })
