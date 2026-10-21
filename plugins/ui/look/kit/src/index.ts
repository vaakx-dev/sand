import { definePlugin } from 'drydock'
import { kit } from './contract'
import { dropCss } from './drop'
import { kit as kitImpl } from './kit'
import { style } from './page/style'

export default definePlugin({
  name: 'kit',
  description: "Sand's buttons, menus, sheets, rows, marks and icons for other extensions to draw with",
  apply(ctx) {
    style(ctx, dropCss)
    ctx.provide(kit, kitImpl)
  },
})
