import type { GitHub } from '@sand/github/contract'

export class SignedOutError extends Error {
  constructor() {
    super('Sign in to GitHub in Settings → Git to see your pull requests.')
    this.name = 'SignedOutError'
  }
}

export const viewerOf = async (github: GitHub) => {
  const auth = await github.auth()
  if (auth.state === 'signed-in') return auth.login
  if (auth.state === 'error') throw new Error(auth.message)
  throw new SignedOutError()
}
