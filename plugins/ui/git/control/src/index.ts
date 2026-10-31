import { header } from '@sand/header/contract'
import { keys } from '@sand/keys/contract'
import { threadSelect } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { buildControl } from './build'
import { gitMenu } from './contract'
import { inject } from './inject'
import { gitControl } from './view/control'

export default definePlugin({
  name: 'git-control',
  description: "Git in the thread header: the branch chip opens a branch picker and one button commits, pushes or pulls the thread's folder",
  inject,
  apply(ctx) {
    const { parts, commit, sections } = buildControl(ctx)
    ctx.provide(gitMenu, { section: sections.section })
    ctx.on(threadSelect, () => commit.close())
    ctx.watch(header, found => found?.slot(() => gitControl(parts), 90, 'end'))
    ctx.watch(keys, found =>
      found?.bind({
        key: 'mod+shift+return',
        global: true,
        when: () => Boolean(parts.model.place.get()),
        run: commit.open,
      }),
    )
  },
})
