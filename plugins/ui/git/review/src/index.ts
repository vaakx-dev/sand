import type { PullRef } from '@sand/github/contract'
import { collectScope, disposeAll, mount } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { agentReviewMenu } from './agent/menu'
import { inject, type ReviewContext } from './inject'
import { codeTab } from './view/tab'

const renderTab = (ctx: ReviewContext, pull: PullRef, host: HTMLElement) => {
  const { value, scope } = collectScope(() => codeTab(ctx, pull))
  const unmount = mount(host, value)
  return () => {
    unmount()
    disposeAll(scope)
  }
}

export default definePlugin({
  name: 'git-review',
  description:
    "The Code tab on a pull request: its changed files with GitHub's viewed marks, line comments gathered into your review, asking the agent about lines, and a review drafted by the agent",
  inject,
  apply(ctx) {
    ctx.effect(() =>
      ctx.pullPage.tab({
        id: 'code',
        title: 'Code',
        order: 20,
        count: pull => pull.files,
        render: (pull, host) => renderTab(ctx, pull, host),
      }),
    )
    ctx.effect(() => ctx.pullPage.menu(agentReviewMenu(ctx)))
  },
})
