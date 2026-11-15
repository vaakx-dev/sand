import { derive, sig } from '@vaakx-dev/vrui'

const FIT = 1

const LEVELS = [0.25, 0.5, 0.75, FIT, 1.25, 1.5, 2, 3, 4]

const zoomLevels = () => {
  const level = sig(FIT)
  const room = sig(0)
  const moveTo = (next: number | undefined) => level.set(next ?? level.get())
  return {
    room,
    width: derive(() => Math.max(1, Math.floor(room.get() * level.get()))),
    label: derive(() => (level.get() === FIT ? 'Fit' : `${Math.round(level.get() * 100)}%`)),
    canZoomOut: derive(() => level.get() > LEVELS[0]!),
    zoomIn: () => moveTo(LEVELS.find(next => next > level.get())),
    zoomOut: () => moveTo(LEVELS.findLast(next => next < level.get())),
    fit: () => level.set(FIT),
  }
}

type Zoom = ReturnType<typeof zoomLevels>

export { zoomLevels, type Zoom }
