import type { Kit } from '@sand/ui-kit/contract'
import type { ProjectShown } from '@sand/web-client/contract'
import type { Child } from '@vaakx-dev/vrui'
import type { RowPart, RowThread } from '../contract'

const markSize = 14

export class RowLooks {
  private marks = new Map<string, () => Child>()
  private trails = new Map<string, () => Child[]>()
  private parts: RowPart[] = []

  mark(kit: Kit, { name, icon }: ProjectShown) {
    const key = `${name}\0${JSON.stringify(icon ?? null)}`
    const found = this.marks.get(key) ?? (() => kit.projectIcon(name, icon, markSize))
    this.marks.set(key, found)
    return found
  }

  trail(parts: RowPart[], folder: RowThread) {
    if (!parts.length) return undefined
    if (parts !== this.parts) this.renew(parts)
    const key = `${folder.id}\0${folder.cwd}\0${folder.device}`
    const found = this.trails.get(key) ?? (() => parts.map(part => part.render(folder)))
    this.trails.set(key, found)
    return found
  }

  private renew(parts: RowPart[]) {
    this.parts = parts
    this.trails.clear()
  }
}
