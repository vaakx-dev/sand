import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { detailsLimit, type Entry, logbookAdd, logbookChange, logbookRemove, logbookSearch, logbookTags, searchLimit, tagLimit, tagsMost, titleLimit, linksMost } from './contract'

const group: McpGroup = { name: 'logbook', label: 'Logbook', summary: 'add to, search, change and remove from the Logbook, the dated record of finished work' }

const always: McpTool['always'] = ['bot']

const id = z.string().describe('The entry id, from logbook_search')
const project = z.string().min(1).nullable().optional()
const title = z.string().trim().min(1).max(titleLimit).describe(`One line saying what was done, at most ${titleLimit} characters`)
const details = z
  .string()
  .trim()
  .max(detailsLimit)
  .describe(`A few sentences: what changed and anything worth finding later, like numbers and decisions; at most ${detailsLimit.toLocaleString('en')} characters`)
const links = z
  .array(z.string().trim().min(1))
  .max(linksMost)
  .describe('Links to the work: PR and commit URLs, and threads as thread:<thread id>')
const tags = z
  .array(z.string().trim().min(1).max(tagLimit))
  .max(tagsMost)
  .describe('A few short lowercase topics; reuse the tags logbook_tags lists before making new ones')
const day = z.iso.date()

const addInput = z.object({
  project: project.describe("A project id from project_list, or null for work with no project (default: your thread's project, or your one project as a bot)"),
  title,
  details: details.optional(),
  links: links.optional(),
  tags: tags.optional(),
})

const changeInput = z.object({
  id,
  project: project.describe('Move it to another project by id, or null for no project'),
  title: title.optional(),
  details: details.optional(),
  links: links.optional(),
  tags: tags.optional(),
})

const removeInput = z.object({ id })

const searchInput = z.object({
  query: z.string().optional().describe('Words to find in titles, details, tags and links; each word matches as a prefix'),
  project: project.describe('Only this project by id, or null for work with no project (default: every project)'),
  tag: z.string().optional().describe('Only entries with this tag'),
  from: day.optional().describe('Only work logged on or after this day, YYYY-MM-DD'),
  to: day.optional().describe('Only work logged before this day, YYYY-MM-DD'),
  limit: z.number().int().min(1).max(searchLimit).optional().describe('At most this many, newest first (default 50)'),
})

const tagsInput = z.object({ project: project.describe('Only tags used in this project by id, or null for work with no project (default: every project)') })

const addRules = `Log a piece of finished work in the Logbook, the dated record every thread and bot shares, which the user reads in the side panel. sand adds the date and you as its author. Log work once it's done, not plans or progress. A bot logs each item it takes out of its plan because it's done. Call logbook_tags first to reuse the tags already in use.`

const searchRules = `Search the Logbook, newest first: what was done, when, by whom, with links to its PRs, commits and threads. Use it to answer what was done in a period, with from and to, or to find the details of past work.`

const startOf = (date: string) => new Date(`${date}T00:00`).getTime()

const shown = ({ id, at, project, author, title, details, links, tags }: Entry) => ({
  id,
  date: new Date(at).toISOString(),
  project,
  ...(author && { author: author.name }),
  title,
  ...(details && { details }),
  ...(links.length && { links }),
  ...(tags.length && { tags }),
})

const logbookTools: McpTool[] = [
  {
    name: 'logbook_add',
    description: addRules,
    input: addInput,
    access: 'operate',
    group: group.name,
    always,
    run: async (input, { call }) => shown(await call(logbookAdd, input)),
  } satisfies McpTool<typeof addInput>,
  {
    name: 'logbook_search',
    description: searchRules,
    input: searchInput,
    access: 'read',
    group: group.name,
    always,
    run: async ({ from, to, ...input }, { call }) => {
      const found = await call(logbookSearch, { ...input, ...(from && { from: startOf(from) }), ...(to && { to: startOf(to) }) })
      return found.map(shown)
    },
  } satisfies McpTool<typeof searchInput>,
  {
    name: 'logbook_tags',
    description: 'List the tags in use in the Logbook, most used first, with how many entries have each',
    input: tagsInput,
    access: 'read',
    group: group.name,
    always,
    run: (input, { call }) => call(logbookTags, input),
  } satisfies McpTool<typeof tagsInput>,
  {
    name: 'logbook_change',
    description: 'Change a Logbook entry: its project, title, details, links or tags. What you leave out stays as it is; links and tags replace the old lists',
    input: changeInput,
    access: 'operate',
    group: group.name,
    always,
    run: async (input, { call }) => shown(await call(logbookChange, input)),
  } satisfies McpTool<typeof changeInput>,
  {
    name: 'logbook_remove',
    description: 'Remove a Logbook entry for good, on every PC',
    input: removeInput,
    access: 'operate',
    group: group.name,
    always,
    run: async (input, { call }) => {
      await call(logbookRemove, input)
      return 'Removed'
    },
  } satisfies McpTool<typeof removeInput>,
]

const offerLogbookTools = (found: McpTools) => joinDisposers(found.group(group), ...logbookTools.map(tool => found.register(tool)))

export { offerLogbookTools }
