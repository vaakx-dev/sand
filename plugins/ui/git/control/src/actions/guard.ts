import type { ControlContext } from '../inject'

export type GuardChoice = 'push' | 'branch'

export const confirmDefaultPush = async (ctx: ControlContext, branch: string): Promise<GuardChoice | undefined> => {
  const picked = await ctx.picker.choose<GuardChoice>(`Push straight to ${branch}?`, [
    { label: 'Move to a new branch', detail: 'Most projects take changes through a branch and a PR', value: 'branch' },
    { label: `Push to ${branch}`, detail: `You're on ${branch}`, value: 'push' },
  ])
  return picked?.value
}

export const askBranchName = async (ctx: ControlContext) => (await ctx.picker.input('Name the new branch'))?.trim() || undefined
