import { inspector } from '@sand/inspector/contract'
import { modelButton, modelTargets } from '@sand/model-panel/contract'
import { shell } from '@sand/ui-shell/contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'inspector-model',
  description: "The inspector's model row: the model and effort a thread or bot runs with, opening the model picker",
  inject: { inspector, modelButton, modelTargets, shell },
  apply(ctx) {
    ctx.effect(() => ctx.modelButton.reveal(() => ctx.shell.showAside('inspector', true)))
    ctx.effect(() =>
      ctx.inspector.row({
        id: 'model',
        group: 'place',
        order: 5,
        shows: subject => ctx.modelTargets.of(subject) !== undefined,
        render: subject => {
          const target = () => ctx.modelTargets.of(subject())
          return ctx.modelButton.view({
            settings: () => target()?.settings() ?? {},
            choose: patch => target()?.choose(patch),
            running: () => target()?.running?.() ?? false,
          })
        },
      }),
    )
  },
})
