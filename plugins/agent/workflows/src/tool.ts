import type { Job } from '@sand/agents/contract'
import type { Tool } from '@sand/tools/contract'
import type { Context } from 'drydock'
import { z } from 'zod'
import { execute } from './execute'
import { createRun, resumeRun } from './store'

const input = z.object({
  script: z.string().optional().describe('TypeScript workflow source. Required unless resuming.'),
  resume: z.string().optional().describe('Run id of an earlier workflow to rerun; finished agent calls are reused'),
  args: z.unknown().optional().describe('Value passed to the script as args; a resumed run reuses its original args unless given'),
  label: z.string().optional().describe('Short name shown in progress updates'),
  background: z.boolean().optional().describe('Defaults to true. Set false to wait for the result in this call.'),
})

const description = `Run a TypeScript workflow that orchestrates subagents in code: fan work out, pipeline it, and collect structured results. Use it when a task splits into many independent agent jobs. It runs in the background by default and reports back as a <task-notification>.

The script default-exports an async function that receives the workflow API:

\`\`\`ts
import { z } from 'zod'

export default async function ({ agent, parallel, pipeline, phase, log, args }) {
  phase('Review')
  const reviews = await parallel(args.files.map((file: string) => () =>
    agent(\`Review \${file} for bugs and report each with its line number.\`, {
      agent: 'explore',
      model: 'haiku',
      schema: z.object({ bugs: z.array(z.object({ line: z.number(), issue: z.string() })) }),
    })))
  return reviews
}
\`\`\`

- agent(task, { agent?, label?, schema?, model?, effort? }) runs a subagent and resolves to its final report, or to a validated object when a zod schema is given. label is 3 to 6 words naming it in the UI. model picks a model by short name such as "haiku" or "opus"; it defaults to the agent definition's model, else the parent's. effort sets the reasoning effort ("low", "medium", "high", "xhigh" or "max"). Subagents cannot see this conversation, so tasks must be self-contained.
- parallel(thunks) runs functions concurrently. pipeline(items, ...stages) sends each item through the stages independently; each stage receives (value, item).
- phase(title) and log(text) report progress. args is the args input.
- Finished agent calls are cached, so resume reruns the script and only repeats unfinished work.
- The return value becomes the workflow result.`

export const workflowTool = (ctx: Context<'agents'>, root: string): Tool<typeof input> => ({
  name: 'workflow',
  description,
  input,
  async run({ script, resume, args, label, background }, { session, call, signal }) {
    if (!script && !resume) throw new Error('Provide a script, or a run id to resume')
    const run = resume ? await resumeRun(root, resume) : await createRun(root, script!, args)
    const execution = { run, label: label ?? run.id, parent: session, origin: call.id, args: args ?? run.args, resumed: Boolean(resume) }
    if (background === false) return execute(ctx, execution, signal)
    const work = (jobSignal: AbortSignal, job: Job) => execute(ctx, { ...execution, job: job.id }, jobSignal)
    const job = ctx.agents.background(session, `workflow ${execution.label}`, work, call.id)
    return `Started workflow ${run.id} as background job ${job.id}. Its result will arrive as a <task-notification>. To rerun it with cached agent results, call workflow with resume: "${run.id}". You don't need to wait for it: keep working on other things, or end your turn and it will wake you when it finishes. Never sleep or poll for it.`
  },
})
