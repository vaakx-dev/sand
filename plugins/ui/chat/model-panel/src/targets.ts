import { sig } from '@vaakx-dev/vrui'
import type { ModelTarget, ModelTargets, TargetSource } from './contract'

export const modelTargets = (): ModelTargets => {
  const sources = sig<TargetSource[]>([])
  return {
    source(source) {
      sources.update(all => [...all, source])
      return () => sources.update(all => all.filter(other => other !== source))
    },
    of: subject => sources.get().reduce<ModelTarget | undefined>((found, source) => found ?? source(subject), undefined),
  }
}
