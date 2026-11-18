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
    description: "Give a bot a job: standing work with a goal and a done-right line, shown as a card on its screen. Set when it runs with routine_create or watch_create. A bot leaves out bot to give itself one.",
    input: createInput,
    access: 'operate',
    group: group.name,
    always,
    run: async (input, { call }) => jobRowOf(await call(jobCreate, input)),
  } satisfies McpTool<typeof createInput>,
  {
    name: 'job_update',
    description: "Change a job's title, goal or done-right line, or pause it so its schedules and watches don't run it.",
    input: updateInput,
    access: 'operate',
    group: group.name,
    always,
    run: async ({ job, ...patch }, { call }) => jobRowOf(await call(jobUpdate, { job, patch })),
  } satisfies McpTool<typeof updateInput>,
  {
    name: 'job_delete',
    description: 'Delete a job with the schedules and watches that run it. Its past runs stay in the chat.',
    input: deleteInput,
    access: 'operate',
    group: group.name,
    always,
    run: (input, { call }) => call(jobDelete, input),
  } satisfies McpTool<typeof deleteInput>,
  {
    name: 'job_report',
    description: "Record one run of a job, once at its end. It shows on the job's card and in the morning summary.",
    input: reportInput,
    access: 'operate',
    group: group.name,
    always,
    run: async (input, { call }) => jobRowOf(await call(jobReport, input)),
  } satisfies McpTool<typeof reportInput>,
]

export const offerJobTools = (found: McpTools) => joinDisposers(found.group(group), ...jobTools.map(tool => found.register(tool)))
