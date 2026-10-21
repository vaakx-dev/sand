import { stored } from '@vaakx-dev/vrui'

export const sectionState = () => {
  const open = stored<Record<string, boolean>>('sand.sidebar.sections', {})
  return {
    isOpen: (key: string, fallback: boolean) => open.get()[key] ?? fallback,
    toggle(key: string, fallback: boolean) {
      open.update(current => ({ ...current, [key]: !(current[key] ?? fallback) }))
    },
  }
}
