import type { Child } from '@vaakx-dev/vrui'
import type { GitMenuContext, GitMenuSection } from '../contract'

export const menuSections = () => {
  let sections: GitMenuSection[] = []

  const section = (entry: GitMenuSection) => {
    sections = [...sections, entry].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return () => {
      sections = sections.filter(other => other !== entry)
    }
  }

  const render = (context: GitMenuContext): Child[][] => sections.map(entry => entry.items(context)).filter(items => items.length > 0)

  return { section, render }
}

export type MenuSections = ReturnType<typeof menuSections>
