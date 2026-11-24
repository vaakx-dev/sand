import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import type { ThemeModel } from '../model'
import { cssPage } from './css'
import { themePage } from './page'

const page = 'theme'

export const themeSettings = (model: ThemeModel) =>
  definePlugin({
    name: 'themes-settings',
    description: 'Settings › Theme: light, dark or follow the system, custom CSS, or reset to sand’s look',
    inject: { kit },
    apply(ctx) {
      ctx.watch(settings, found =>
        found
          ? joinDisposers(
              found.page({
                id: page,
                label: 'Theme',
                icon: 'palette',
                group: 'app',
                order: 10,
                render: () => themePage(ctx.kit, model, { css: () => found.open(`${page}-css`) }),
              }),
              found.page({ id: `${page}-css`, label: 'Custom CSS', parent: page, group: 'app', render: () => cssPage(ctx.kit, model) }),
            )
          : undefined,
      )
    },
  })
