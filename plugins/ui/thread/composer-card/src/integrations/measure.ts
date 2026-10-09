import { onMount, resizeObserver } from '@sand/dom'

const root = () => document.documentElement.style

export const publishHeight = (view: HTMLElement, property: string) => {
  resizeObserver(view, () => root().setProperty(property, `${view.offsetHeight}px`))
  onMount(view, () => () => root().removeProperty(property))
}

export const parentRect = (node: HTMLElement) => node.parentElement?.getBoundingClientRect()
