import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { fetchPr } from '../pr/fetch'
import { formatPr } from '../pr/format'

export const prInput = z.string().optional().describe('PR number, URL or branch. Defaults to the PR of the current branch')

const input = z.object({ pr: prInput })

export const statusTool: Tool<typeof input> = {
  name: 'pr_status',
  description:
    'Summarize a GitHub PR: state, mergeability, checks with failed log tails, unresolved threads and new comments.',
  input,
  run: async ({ pr }, { cwd, signal }) => formatPr(await fetchPr(pr, cwd, signal)),
}
