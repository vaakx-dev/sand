import { mount, type Child } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { owned } from '../reactive/owned'

export const floating = (ctx: Context, build: () => Child) => owned(ctx, () => mount(document.body, build()))
