import { jobCreate, jobDelete, jobPatch, jobReport, jobUpdate, newJob, runReport } from '@sand/bots/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { jobRowOf } from './row'

const group: McpGroup = { name: 'jobs', label: 'Jobs', summary: "set up, change, pause and remove a bot's jobs, and report a job's runs" }

const always: McpTool['always'] = ['bot']

const job = z.string().describe('The job id, from bot_list')

const createInput = newJob()
const updateInput = jobPatch().extend({ job })
const deleteInput = z.object({ job })
const reportInput = runReport()

export const jobTools: McpTool[] = [
  {
    name: 'job_create',
    description:
      "Give a bot a job: standing work with a goal and what done right means, shown to the user as a card on the bot's screen. Then set when it runs with routine_create or watch_create, passing the job id. A bot leaves out bot to give itself one.",
    input: createInput,
    access: 'operate',
    group: group.name,
    always,
    run: async (input, { call }) => jobRowOf(await call(jobCreate, input)),
  } satisfies McpTool<typeof createInput>,
  {
    name: 'job_update',
    description: "Change a job's title, goal or done right line, or pause it with paused true so its schedules and watches don't run it, and resume it with false.",
    input: updateInput,
    access: 'operate',
    group: group.name,
    always,
    run: async ({ job, ...patch }, { call }) => jobRowOf(await call(jobUpdate, { job, patch })),
  } satisfies McpTool<typeof updateInput>,
  {
    name: 'job_delete',
    description: 'Delete a job for good, with the schedules and watches that run it. Its past runs stay in the chat.',
    input: deleteInput,
    access: 'operate',
    group: group.name,
    always,
    run: (input, { call }) => call(jobDelete, input),
  } satisfies McpTool<typeof deleteInput>,
  {
    name: 'job_report',
    description:
      "Record one run of a job, once at its end: what you did, that there was nothing to do, or the question the user has to decide. It shows on the job's card and in the morning summary; a question marks the job as needing the user until the next report.",
    input: reportInput,
    access: 'operate',
    group: group.name,
    always,
    run: async (input, { call }) => jobRowOf(await call(jobReport, input)),
  } satisfies McpTool<typeof reportInput>,
]

export const offerJobTools = (found: McpTools) => joinDisposers(found.group(group), ...jobTools.map(tool => found.register(tool)))
