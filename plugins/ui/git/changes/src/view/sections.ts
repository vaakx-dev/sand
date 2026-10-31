import type { Sig } from '@vaakx-dev/vrui'

interface Section {
  element: HTMLElement
  open: Sig<boolean>
}

export const sectionIndex = () => {
  const sections = new Map<string, Section>()
  return {
    add(path: string, section: Section) {
      sections.set(path, section)
      return () => {
        if (sections.get(path) === section) sections.delete(path)
      }
    },
    jump(path: string) {
      const section = sections.get(path)
      if (!section) return
      section.open.set(true)
      section.element.scrollIntoView({ block: 'start' })
    },
  }
}

export type SectionIndex = ReturnType<typeof sectionIndex>
