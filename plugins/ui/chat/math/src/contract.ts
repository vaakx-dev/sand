import { service } from 'drydock'

export type Typeset = Node | { error: string }

export interface MathRenderer {
  inline(tex: string): Typeset
  display(tex: string): Typeset
}

export const math = service<MathRenderer>('math')
