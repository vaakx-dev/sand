import { draftsChange } from '@sand/composer/contract'
import { threadPcs } from '@sand/devices-contract'
import { threads, threadSelect, threadsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import type { Ui } from '../ui'

export const threadPlace = (ui: Ui) => {
  const changes = pulse(ui.ctx, [threadSelect, threadsChange, draftsChange], [threadPcs, threads])
  return {
    pc: changes.read(() => ui.ctx.get(threadPcs)?.current() ?? ui.data.homeId()),
    draft: changes.read(() => ui.ctx.get(threads)?.drafting()),
  }
}

export type ThreadPlace = ReturnType<typeof threadPlace>
