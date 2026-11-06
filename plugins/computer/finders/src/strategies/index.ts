import type { Finder, StrategySpec } from '../contract'
import { grid } from './grid'
import { marks } from './marks'
import { zoom } from './zoom'

const single = (finder: Finder): Finder => ({
  id: `${finder.id}/single`,
  label: finder.label,
  locate: ({ screenshot, target }, signal) => finder.locate({ screenshot, target }, signal),
})

const list = (finder: Finder): Finder => ({
  id: `${finder.id}/list`,
  label: `${finder.label}, with the element list`,
  locate: (input, signal) => finder.locate(input, signal),
})

export const withStrategy = (finder: Finder, strategy: StrategySpec): Finder => {
  switch (strategy.kind) {
    case 'single':
      return single(finder)
    case 'list':
      return list(finder)
    case 'marks':
      return marks(finder)
    case 'zoom':
      return zoom(finder, strategy)
    case 'grid':
      return grid(finder, strategy)
  }
}
