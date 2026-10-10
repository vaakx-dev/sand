import { place } from '@sand/dom'
import type { Context, Dispose } from 'drydock'
import type { GithubControl } from '../state'
import { signInModel } from './model'
import { signInSheet } from './view'

export const signInOpener = (ctx: Context, control: GithubControl) => {
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const view = () => {
    const model = signInModel(control, text => {
      close()
      if (text) ctx.notify?.push(text)
    })
    return signInSheet(model, () => {
      model.cancel()
      close()
    })
  }
  ctx.effect(() => close)
  return () => {
    close()
    unplace = place(ctx, 'overlay', view, 100)
  }
}
