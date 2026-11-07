import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { reportHtml } from './report'
import { openLab, runTask, type Lab, type LabOptions, type Model, type Outcome } from './run'
import { serveSite, tasks, type Task, type TaskSet } from './tasks'

const defaultModels = ['Haiku=openrouter/anthropic/claude-haiku-5.5', 'Luna=openrouter/openai/gpt-6-luna', 'DeepSeek=openrouter/deepseek/deepseek-v4.1-flash-1017']

const sets: TaskSet[] = ['browser', 'desktop']

const { values } = parseArgs({
  options: {
    set: { type: 'string', default: 'browser' },
    models: { type: 'string', default: defaultModels.join(',') },
    tasks: { type: 'string' },
    judge: { type: 'string', default: 'openrouter/anthropic/claude-sonnet-5.5' },
    profile: { type: 'string' },
    headed: { type: 'boolean', default: false },
    minutes: { type: 'string', default: '5' },
    cap: { type: 'string', default: '5' },
    out: { type: 'string', default: join(tmpdir(), 'sand-computer-bench', new Date().toISOString().replaceAll(':', '-').slice(0, 19)) },
  },
})

const listOf = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)

const set = sets.find(each => each === values.set)
if (!set) throw new Error(`Unknown set ${values.set}; pick ${sets.join(' or ')}`)

const models: Model[] = listOf(values.models).map(entry => {
  const [label, id] = entry.includes('=') ? entry.split('=') : [entry.split('/').at(-1)!, entry]
  return { label: label!, id: id! }
})

const named = values.tasks ? listOf(values.tasks) : undefined
const unknown = named?.filter(id => !tasks.some(task => task.id === id)) ?? []
if (unknown.length) throw new Error(`Unknown tasks ${unknown.join(', ')}; pick from ${tasks.map(task => task.id).join(', ')}`)
const inSet = tasks.filter(task => task.set === set && (!named || named.includes(task.id)))
const chosen = inSet.filter(task => task.place !== 'account' || values.profile)
const notes: string[] = []
if (chosen.length < inSet.length) notes.push(`Skipped the tasks that need a signed-in browser (${inSet.filter(task => !chosen.includes(task)).map(task => task.id).join(', ')}); pass --profile with a copy of a signed-in browser profile to run them.`)

const options: LabOptions = { set, judge: values.judge, headless: !values.headed, profile: values.profile, limitMs: Number(values.minutes) * 60_000 }
const budget = { cap: Number(values.cap), spent: 0 }
const site = serveSite()
const outcomes: Outcome[] = []

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

const failed = (model: Model, task: Task, error: unknown): Outcome => ({
  model: model.label,
  task: task.id,
  place: task.place,
  pass: false,
  why: `error: ${messageOf(error)}`,
  ms: 0,
  steps: 0,
  inputTokens: 0,
  outputTokens: 0,
  judgeUsd: 0,
  answer: '',
  stopReason: 'error',
})

const runTasks = async (lab: Lab) => {
  const { model } = lab
  try {
    for (const task of chosen) {
      if (budget.spent >= budget.cap) {
        notes.push(`Stopped at the $${budget.cap} cap before ${model.label} ran ${task.id}.`)
        return
      }
      const outcome = await runTask(lab, task, site.url.origin).catch((error: unknown) => failed(model, task, error))
      budget.spent += (outcome.costUsd ?? 0) + outcome.judgeUsd
      outcomes.push(outcome)
      console.log(`  ${model.label} ${task.id}: ${outcome.pass ? 'pass' : 'fail'} in ${(outcome.ms / 1000).toFixed(0)}s, ${outcome.steps} steps (${outcome.why})`)
    }
  } finally {
    await lab.sand.stop()
  }
}

const runModel = (model: Model) =>
  openLab(model, options).then(runTasks, (error: unknown) => void notes.push(`${model.label} did not start: ${messageOf(error)}`))

mkdirSync(values.out, { recursive: true })
console.log(`${chosen.length} ${set} tasks × ${models.length} models, cap $${budget.cap}`)
try {
  if (set === 'desktop') {
    console.log('Desktop tasks move the real mouse and keyboard. Leave the PC alone until the bench ends; starting in 10 seconds.')
    await Bun.sleep(10_000)
    for (const model of models) await runModel(model)
  } else {
    await Promise.all(models.map(runModel))
  }
} finally {
  await site.stop(true)
}

const title = `Computer use bench: ${chosen.length} ${set} tasks, ${models.length} models, $${budget.spent.toFixed(2)} spent`
notes.push(
  `Models through sand's LLM service, each in its own in-process sand with only the computer tools: ${models.map(model => `${model.label} = ${model.id}`).join(', ')}.`,
  set === 'browser'
    ? `Browser tasks run in ${options.headless ? 'a headless' : 'a visible'} Chrome per model; local tasks use pages the bench serves itself, with values drawn fresh each run.`
    : 'Desktop tasks ran one model at a time on this PC with the real mouse and keyboard.',
  `Checks read the browser's tabs (URL, text, form fields), the screen's UI elements, the model's final reply where the answer is only on the page, or a screenshot judged by ${options.judge}. A task stops after ${values.minutes} minutes.`,
  'Cost is the model\'s own tokens at its price; the judge\'s cost counts toward the cap only.',
)
const order = models.map(model => model.label)
await Bun.write(join(values.out, 'results.json'), JSON.stringify({ title, notes, models, tasks: chosen.map(task => task.id), budget, outcomes }, null, 2))
await Bun.write(join(values.out, 'report.html'), reportHtml({ title, notes, models: order, tasks: chosen.map(task => task.id), outcomes }))
console.log(`results: ${join(values.out, 'results.json')}\nreport: ${join(values.out, 'report.html')}`)
process.exit(0)
