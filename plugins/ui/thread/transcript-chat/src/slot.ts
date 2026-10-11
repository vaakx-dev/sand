import { derive, dynamicChild, sig } from '@sand/dom'

interface Slotted {
  key: string
  build(): HTMLElement
}

export const slotHost = () => {
  const slotted = sig<Slotted | undefined>(undefined)
  const key = derive(() => slotted.get()?.key ?? '')
  return {
    node: dynamicChild(key, () => slotted.get()?.build()),
    show: (key: string, build: () => HTMLElement) => slotted.set({ key, build }),
    clear: () => slotted.set(undefined),
  }
}
