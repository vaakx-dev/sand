import { newThreadHome } from '@sand/threads-home/contract'
import { kit } from '@sand/ui-kit/contract'
import { dynamicChild, span } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'project-picker',
  description: "The project a new thread starts in, at the left of the new-thread screen's header",
  inject: { kit, newThreadHome },
  apply(ctx) {
    const home = ctx.newThreadHome
    ctx.effect(() =>
      home.head({
        id: 'project',
        order: 10,
        render: () =>
          ctx.kit.quietButton(
            { title: 'Change the project', class: 'min-w-0 gap-2 px-2', onClick: () => home.chooseProject() },
            dynamicChild(
              () => home.project(),
              found => ctx.kit.projectIcon(found.name, found.icon, 16),
            ),
            span({ class: 'min-w-0 truncate text-sm text-neutral-200' }, () => home.project().name),
          ),
      }),
    )
  },
})
