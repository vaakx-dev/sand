import { div } from '@vaakx-dev/vrui'
import { layer } from '../shell/layers'
import { color } from '../theme/tokens'

export const dockFade = () =>
  div({
    class: [layer.sticky, 'pointer-events-none sticky bottom-0'],
    style: { height: 'var(--dock-h, 0px)', background: `linear-gradient(to top, ${color('neutral', 900)} 55%, transparent)` },
  })
