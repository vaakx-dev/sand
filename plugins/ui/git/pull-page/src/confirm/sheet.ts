import { place } from '@sand/layout/place'
import type { Dispose } from 'drydock'
import type { PageContext } from '../inject'

export interface ConfirmAsk {
  title: string
  text: string
  action: string
}

export const confirmSheet = (ctx: PageContext, ask: ConfirmAsk) =>
  new Promise<boolean>(settle => {
    const { kit } = ctx
    let unplace: Dispose | undefined
    const finish = (answer: boolean) => {
      void unplace?.()
      unplace = undefined
      settle(answer)
    }
    unplace = place(
      ctx,
      'overlay',
      () =>
        kit.overlay(
          () => finish(false),
          kit.sheet(
            { 'aria-label': ask.title, size: 'sm' },
            kit.sheetHead({ title: ask.title, close: () => finish(false) }),
            kit.sheetBody({}, kit.sheetText(ask.text)),
            kit.sheetFoot(
              kit.quietButton({ surface: 'raised', onClick: () => finish(false) }, 'Cancel'),
              kit.primaryAction({ onClick: () => finish(true) }, ask.action),
            ),
          ),
        ),
      100,
    )
  })
