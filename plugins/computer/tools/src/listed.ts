import type { UiElement } from '@sand/computers/contract'

interface Owner {
  computer: string
  chat: string
}

const MAX_LISTS = 64

const keyOf = ({ computer, chat }: Owner) => `${computer}\n${chat}`

class Listed {
  private lists = new Map<string, Map<string, UiElement>>()

  remember(owner: Owner, elements: UiElement[]) {
    const key = keyOf(owner)
    this.lists.delete(key)
    this.lists.set(key, new Map(elements.map(element => [element.ref, element])))
    const oldest = this.lists.keys().next().value
    if (this.lists.size > MAX_LISTS && oldest !== undefined) this.lists.delete(oldest)
  }

  element(owner: Owner, ref: string) {
    const element = this.lists.get(keyOf(owner))?.get(ref)
    if (!element) throw new Error(`No element ${ref} in your last list on this computer. Call computer_elements again.`)
    return element
  }
}

export { Listed, type Owner }
