import type { Context } from 'drydock'
import { type ProjectGroup, projectsChange, type Wire } from '../contract'

interface Icon {
  hash: string
  url?: string
  missed?: boolean
}

const iconPath = (project: string, hash: string) => `/project-icon?${new URLSearchParams({ project, v: hash })}`

export const projectIcons = (ctx: Context, wire: Wire) => {
  const icons = new Map<string, Icon>()
  let generation = 0

  const load = async (project: string, hash: string, from: number) => {
    const response = await wire.fetch(iconPath(project, hash)).catch(() => undefined)
    const blob = response?.ok ? await response.blob() : undefined
    if (from !== generation || icons.get(project)?.hash !== hash) return
    icons.set(project, blob ? { hash, url: URL.createObjectURL(blob) } : { hash, missed: true })
    if (blob) ctx.emit(projectsChange)
  }

  return {
    get({ id, iconFile }: ProjectGroup) {
      if (!iconFile) return undefined
      const icon = icons.get(id)
      if (icon?.hash === iconFile.hash) return icon.url
      if (icon?.url) URL.revokeObjectURL(icon.url)
      icons.set(id, { hash: iconFile.hash })
      void load(id, iconFile.hash, generation)
      return undefined
    },
    retryMissed() {
      const missed = [...icons].filter(([, icon]) => icon.missed)
      for (const [id] of missed) icons.delete(id)
      if (missed.length) ctx.emit(projectsChange)
    },
    clear() {
      generation++
      for (const icon of icons.values()) if (icon.url) URL.revokeObjectURL(icon.url)
      icons.clear()
    },
  }
}
