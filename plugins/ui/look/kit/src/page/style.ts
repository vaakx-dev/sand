import { el, mount } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export const style = (ctx: Context, css: string) => ctx.effect(() => mount(document.head, el('style', { 'data-plugin': ctx.scope.name }, css)))
