import { derive, dynamicChild, sig, span, untrack } from '@sand/dom'

interface Slotted {
  key: string
  build(): HTMLElement
}

export const slotHost = () => {
  const slotted = sig<Slotted | undefined>(undefined)
  const key = derive(() => slotted.get()?.key ?? '')
  const node = dynamicChild(key, () => untrack(() => slotted.get())?.build() ?? span({ class: 'hidden' }))
  return {
    node,
    show: (key: string, build: () => HTMLElement) => slotted.set({ key, build }),
    clear: () => slotted.set(undefined),
  }
}
