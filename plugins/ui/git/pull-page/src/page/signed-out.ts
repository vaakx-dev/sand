import { settings } from '@sand/settings/contract'
import type { GitHubAuth } from '@sand/github/contract'
import { div } from '@vaakx-dev/vrui'
import type { PageParts } from '../parts'

export type GitHubState = 'checking' | 'ready' | 'signed-out'

export const githubState = (auth: GitHubAuth | undefined): GitHubState => {
  if (!auth) return 'checking'
  return auth.state === 'signed-in' ? 'ready' : 'signed-out'
}

export const signedOutNotice = (parts: PageParts) => {
  const { kit, ctx } = parts
  const found = ctx.get(settings)
  return div(
    { class: 'mx-auto w-full max-w-4xl p-3' },
    kit.emptyState({
      text: 'Sign in to GitHub to see your pull requests.',
      action: found ? kit.linkButton({ onClick: () => found.open('git') }, 'Open Git settings') : null,
    }),
  )
}
