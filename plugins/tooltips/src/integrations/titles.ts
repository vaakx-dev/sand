import { scoped } from '@sand/dom'

const named = new WeakSet<Element>()

const visibleText = (node: Element) => node.textContent?.replace(/\s+/g, ' ').trim() ?? ''

const describe = (node: Element, text: string) => {
  if (named.has(node) || (!node.hasAttribute('aria-label') && !visibleText(node))) {
    named.add(node)
    if (text) node.setAttribute('aria-label', text)
    else node.removeAttribute('aria-label')
    return
  }
  if (text && text !== node.getAttribute('aria-label') && text !== visibleText(node)) node.setAttribute('aria-description', text)
  else node.removeAttribute('aria-description')
}

const adopt = (node: Element) => {
  const text = node.getAttribute('title')?.trim() ?? ''
  node.removeAttribute('title')
  node.setAttribute('data-tip', text)
  describe(node, text)
}

export const adoptTitles = (from: Element) => {
  for (let node: Element | null = from; node; node = node.parentElement) if (node.hasAttribute('title')) adopt(node)
}

const clipped = (node: Element) => [node, ...node.querySelectorAll('*')].some(part => part.scrollWidth > part.clientWidth)

export const tipOf = (node: Element) => {
  const text = node.getAttribute('data-tip') ?? ''
  return text === visibleText(node) && !clipped(node) ? '' : text
}

export const restoreTitles = () => {
  for (const node of document.querySelectorAll('[data-tip]')) {
    node.setAttribute('title', node.getAttribute('data-tip') ?? '')
    node.removeAttribute('data-tip')
    node.removeAttribute('aria-description')
    if (named.has(node)) node.removeAttribute('aria-label')
  }
}

const live = (node: Element) => node.matches(':hover') || node.contains(document.activeElement)

const retitledIn = (records: MutationRecord[]) =>
  records.flatMap(({ type, target }) => (type === 'attributes' && target instanceof Element && target.hasAttribute('title') && live(target) ? [target] : []))

export const watchTitles = (changed: (retitled: Element[], moved: boolean) => void) => {
  const observer = new MutationObserver(records => changed(retitledIn(records), records.some(({ type }) => type === 'childList')))
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] })
  return scoped(() => observer.disconnect())
}
