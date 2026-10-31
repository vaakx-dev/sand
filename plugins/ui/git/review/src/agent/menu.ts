import type { PullMenu } from '@sand/git-pull-page/contract'
import { span } from '@vaakx-dev/vrui'
import type { ReviewContext } from '../inject'
import { agentReview } from './review'

const label = (text: string) => span({ class: 'min-w-0 flex-1 truncate' }, text)

export const agentReviewMenu = (ctx: ReviewContext): PullMenu => {
  const { kit } = ctx
  const agent = agentReview(ctx)
  return {
    id: 'review-with-agent',
    order: 15,
    items: ({ pull, close }) => {
      if (pull.state !== 'open' && pull.state !== 'draft') return []
      const ref = { repo: pull.repo, number: pull.number }
      if (!ctx.pullPage.localCopy(pull.repo))
        return [kit.menuItem({ icon: 'sparkles', disabled: true }, label('Review with the agent'), kit.menuReason(`Add a project with ${pull.repo} as its remote first`))]
      return [
        kit.menuItem(
          {
            icon: 'sparkles',
            disabled: () => agent.starting(ref),
            onClick: () => {
              close()
              void agent.start(ref)
            },
          },
          label('Review with the agent'),
          kit.menuReason('It adds comments to your review'),
        ),
      ]
    },
  }
}
