import { colorVar, div } from '@vaakx-dev/vrui'
import { layer } from '../layer'

export const dockFade = () =>
  div({
    class: [layer.sticky, 'pointer-events-none sticky bottom-0'],
    style: { height: 'var(--dock-h, 0px)', background: `linear-gradient(to top, ${colorVar('neutral', 900)} 55%, transparent)` },
  })
