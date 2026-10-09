import type { Effort } from '@sand/llm-accounts/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import { jsonSchema, parseOutput, type Schema } from './schema'
import type { Run } from './store'

export interface AgentOptions {
  agent?: string
  label?: string
  schema?: Schema
  model?: string
  effort?: Effort
}

interface Options {
  run: Run
  label: string
  parent: Session
  origin: string
  args: unknown
  signal: AbortSignal
  job?: string
}

const withSchema = (task: string, schema: Schema) =>
  `${task}\n\nEnd your final reply with a JSON value in a \`\`\`json code block that matches this JSON Schema:\n\`\`\`json\n${JSON.stringify(jsonSchema(schema), null, 2)}\n\`\`\``

export const createApi = (ctx: Context<'agents'>, options: Options) => {
  const { run, parent, origin, signal } = options
  const seen = new Map<string, number>()

  const spawn = async (task: string, agentOptions: AgentOptions) => {
    signal.throwIfAborted()
    const prompt = agentOptions.schema ? withSchema(task, agentOptions.schema) : task
    const { label, agent, model, effort } = agentOptions
    const result = await ctx.agents.run({ parent, task: prompt, label, agent, model, effort, origin, signal, wait: true })
    if (result.stopReason === 'interrupted') throw new Error('Workflow interrupted')
    if (!agentOptions.schema) return result.text
    let parsed = parseOutput(agentOptions.schema, result.text)
    if (!parsed.ok && ctx.loop) {
      const fix = `Your final JSON did not match the schema: ${parsed.error}\nReply with only the corrected JSON code block.`
      parsed = parseOutput(agentOptions.schema, (await ctx.loop.run(result.session, fix, signal)).text)
    }
    if (!parsed.ok) throw new Error(`Agent output did not match the schema: ${parsed.error}`)
    return parsed.value
  }

  const agent = async (task: string, agentOptions: AgentOptions = {}) => {
    const schema = agentOptions.schema ? jsonSchema(agentOptions.schema) : null
    const choice = agentOptions.model || agentOptions.effort ? [agentOptions.model ?? null, agentOptions.effort ?? null] : []
    const base = Bun.hash(JSON.stringify([task, agentOptions.agent ?? 'general', schema, ...choice])).toString(36)
    const occurrence = seen.get(base) ?? 0
    seen.set(base, occurrence + 1)
    const key = `${base}#${occurrence}`
    if (key in run.results) return run.results[key]
    const value = await spawn(task, agentOptions)
    run.results[key] = value
    await run.save()
    return value
  }

  const report = (text: string) => {
    ctx.ui?.notify(`⚙ ${options.label}: ${text}`)
    if (options.job) ctx.emit('job.note', { id: options.job, label: options.label, text })
  }

  return {
    args: options.args,
    signal,
    agent,
    parallel: <T>(tasks: (() => Promise<T>)[]) => Promise.all(tasks.map(task => task())),
    pipeline: <T>(items: T[], ...stages: ((value: any, item: T) => unknown)[]) =>
      Promise.all(
        items.map(item => stages.reduce<Promise<unknown>>((value, stage) => value.then(current => stage(current, item)), Promise.resolve(item))),
      ),
    phase: (title: string) => report(title),
    log: report,
  }
}
