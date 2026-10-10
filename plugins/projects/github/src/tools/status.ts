import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { fetchPr } from '../pr/fetch'
import { formatPr } from '../pr/format'

export const prInput = z.string().optional().describe('PR number, URL or branch. Defaults to the PR of the current branch')

const input = z.object({ pr: prInput })

export const statusTool: Tool<typeof input> = {
  name: 'pr_status',
  description:
    'Summarize a GitHub pull request in one call: state, merge state against the base, checks with the log tail of failed jobs, unresolved review threads and comments since the head commit.',
  input,
  run: async ({ pr }, { cwd, signal }) => formatPr(await fetchPr(pr, cwd, signal)),
}
