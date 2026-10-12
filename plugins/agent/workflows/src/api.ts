import type { Effort } from '@sand/llm-accounts/contract'
import type { Context } from 'drydock'
import { z } from 'zod'
import type { Execution } from './execute'
import { jsonSchema, parseOutput, type Schema } from './schema'

export interface AgentOptions {
  agent?: string
  label?: string
  schema?: Schema
  model?: string
  effort?: Effort
}

const withSchema = (task: string, schema: Schema) =>
  `${task}\n\nEnd your final reply with a JSON value in a \`\`\`json code block that matches this JSON Schema:\n\`\`\`json\n${JSON.stringify(jsonSchema(schema), null, 2)}\n\`\`\``

const stopped = Symbol('stopped')

const handled = <T>(promise: Promise<T>) => {
  promise.catch(() => {})
  return promise
}

export const createApi = (ctx: Context<'agents' | 'loop'>, execution: Execution, signal: AbortSignal) => {
  const { run, parent, origin } = execution
  const seen = new Map<string, number>()

  const spawn = async (task: string, options: AgentOptions) => {
    if (signal.aborted) throw new Error('Workflow interrupted')
    const prompt = options.schema ? withSchema(task, options.schema) : task
    const { label, agent, model, effort } = options
    const result = await ctx.agents.run({ parent, task: prompt, label, agent, model, effort, origin, signal, wait: true })
    if (result.stopReason === 'interrupted') {
      if (signal.aborted) throw new Error('Workflow interrupted')
      ctx.ui?.notify(`⚙ ${execution.label}: ${label ?? 'an agent'} was stopped`)
      return stopped
    }
    if (!options.schema) return result.text
    let parsed = parseOutput(options.schema, result.text)
    if (!parsed.ok) {
      const fix = `Your final JSON did not match the schema: ${parsed.error}\nReply with only the corrected JSON code block.`
      parsed = parseOutput(options.schema, (await ctx.loop.run(result.session, fix, signal)).text)
    }
    if (!parsed.ok) throw new Error(`Agent output did not match the schema: ${parsed.error}`)
    return parsed.value
  }

  const agent = async (task: string, options: AgentOptions = {}) => {
    const schema = options.schema ? jsonSchema(options.schema) : null
    const choice = options.model || options.effort ? [options.model ?? null, options.effort ?? null] : []
    const base = Bun.hash(JSON.stringify([task, options.agent ?? 'general', schema, ...choice])).toString(36)
    const occurrence = seen.get(base) ?? 0
    seen.set(base, occurrence + 1)
    const key = `${base}#${occurrence}`
    if (key in run.results) return run.results[key]
    const value = await spawn(task, options)
    if (value === stopped) return null
    run.results[key] = value
    await run.save()
    return value
  }

  const report = (text: string) => {
    ctx.ui?.notify(`⚙ ${execution.label}: ${text}`)
    if (execution.job) ctx.emit('job.note', { id: execution.job, label: execution.label, text })
  }

  return {
    args: execution.args,
    signal,
    z,
    agent: (task: string, options?: AgentOptions) => handled(agent(task, options)),
    parallel: <T>(tasks: (() => Promise<T>)[]) => handled(Promise.all(tasks.map(task => handled(Promise.resolve().then(task))))),
    pipeline: <T>(items: T[], ...stages: ((value: unknown, item: T) => unknown)[]) =>
      handled(
        Promise.all(
          items.map(item => handled(stages.reduce<Promise<unknown>>((value, stage) => value.then(current => stage(current, item)), Promise.resolve(item)))),
        ),
      ),
    phase: (title: string) => report(title),
    log: report,
  }
}
