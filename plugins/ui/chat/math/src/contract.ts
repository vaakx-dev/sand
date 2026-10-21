import { service } from 'drydock'

export interface MathRenderer {
  inline(tex: string): Node
  display(tex: string): Node
}

export const math = service<MathRenderer>('math')
