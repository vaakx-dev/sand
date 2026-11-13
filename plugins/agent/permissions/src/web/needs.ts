import { botRoster } from '@sand/bots/contract'
import type { Need, NeedAction, NeedSource } from '@sand/needs-you/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { projects, threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import type { Decision } from '../contract'
import type { Model, Question } from './model'
import { type Choice, choicesOf, questionBody, questionHead } from './question'

const MARK_SIZE = 16

const threadMark = (ctx: Context, kit: Kit, id: string) => {
  const thread = ctx.get(threads)?.get(id)
  const found = thread && ctx.get(projects)?.shown({ path: thread.info.cwd, device: thread.device, project: thread.info.project, quick: thread.info.kind === 'quick' })
  return found ? kit.projectIcon(found.name, found.icon, MARK_SIZE) : kit.icon('message', 'sm')
}

const botMark = (ctx: Context, kit: Kit, id: string) => {
  const bot = ctx.get(botRoster)?.find(id)
  return kit.botFace(id, bot?.color ?? 'grey', MARK_SIZE)
}

export const markOf = (ctx: Context, kit: Kit, { owner, conversation }: Decision) => (owner === 'bot' ? botMark(ctx, kit, conversation) : threadMark(ctx, kit, conversation))

export const actionsOf = (model: Model, question: Question): Need['actions'] => {
  const action = (choice: Choice): NeedAction => ({ label: choice.label, run: () => model.answer(question, choice.answer) })
  const [first, ...rest] = choicesOf(question.decision)
  return [action(first), ...rest.map(action)]
}

const needOf = (ctx: Context, kit: Kit, model: Model, question: Question): Need => {
  const { decision } = question
  return {
    id: `permission:${decision.id}:${decision.outcome}`,
    kind: 'permission',
    who: decision.title,
    mark: () => markOf(ctx, kit, decision),
    title: `Allow ${decision.tool}? ${decision.summary}`,
    head: () => questionHead(decision),
    text: () => questionBody(kit, decision),
    at: decision.at,
    actions: actionsOf(model, question),
  }
}

export const permissionNeeds = (ctx: Context, kit: Kit, model: Model): NeedSource => ({
  id: 'permissions',
  items: () => model.all.get().map(question => needOf(ctx, kit, model, question)),
})
