import { mount, type Child } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { owned } from '../reactive/owned'

export const float = (...children: Child[]) => mount(document.body, ...children)

export const floating = (ctx: Context, build: () => Child) => owned(ctx, () => float(build()))
