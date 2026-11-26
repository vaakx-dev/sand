import { addressLayer, addressSettled, leaveLayer, pushLayer } from '@sand/web-client/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { SheetSpec } from './contract'

const NAMES = { drawer: 'drawer', sheet: 'sheet', aside: 'aside:' } as const

const COVER_JOIN = ' '

const coverIdsOf = (name: string | undefined) => (name?.startsWith(NAMES.aside) ? name.slice(NAMES.aside.length).split(COVER_JOIN) : [])

const layerStack = () => {
  const name = sig(addressLayer())
  const sheets = sig<SheetSpec[]>([])

  const dropSheets = () => {
    const dropped = sheets.get()
    if (!dropped.length) return
    sheets.set([])
    for (const spec of dropped) spec.onClose?.()
  }

  const enter = (layer: string) => {
    pushLayer(layer)
    name.set(addressSettled() ? addressLayer() : undefined)
    if (layer !== NAMES.sheet) dropSheets()
  }

  const leave = () => {
    leaveLayer()
    name.set(undefined)
    dropSheets()
  }

  const closeSheet = (spec: SheetSpec) => {
    const all = sheets.get()
    if (!all.includes(spec)) return false
    const rest = all.filter(other => other !== spec)
    sheets.set(rest)
    if (!rest.length && name.get() === NAMES.sheet) leave()
    return true
  }

  return {
    leave,
    closeSheet,
    coverIds: derive(() => coverIdsOf(name.get())),
    inDrawer: derive(() => name.get() === NAMES.drawer),
    sheetsShown: derive(() => (name.get() === NAMES.sheet ? sheets.get() : [])),
    enterDrawer: () => enter(NAMES.drawer),
    enterCovers: (ids: string[]) => (ids.length ? enter(`${NAMES.aside}${ids.join(COVER_JOIN)}`) : leave()),
    leaveAny() {
      if (name.get()) leave()
    },
    showSheet(spec: SheetSpec) {
      if (name.get() !== NAMES.sheet) enter(NAMES.sheet)
      sheets.update(all => [...all.filter(other => other !== spec), spec])
    },
    dismissSheet(spec: SheetSpec) {
      if (closeSheet(spec)) spec.onClose?.()
    },
    follow() {
      name.set(addressLayer())
      if (name.get() !== NAMES.sheet) dropSheets()
    },
  }
}

type Layers = ReturnType<typeof layerStack>

export { layerStack, type Layers }
