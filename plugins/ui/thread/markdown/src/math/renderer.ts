import type { MathRenderer } from '@sand/math/contract'

let current: MathRenderer | undefined

export const useMath = (renderer: MathRenderer | undefined) => {
  current = renderer
}

export const math = () => current
