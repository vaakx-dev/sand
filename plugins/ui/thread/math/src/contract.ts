export interface MathRenderer {
  inline(tex: string): Node
  display(tex: string): Node
}

declare module 'drydock' {
  interface Services {
    math: MathRenderer
  }
}
