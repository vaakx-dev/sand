import type { SetupLines } from '@sand/worktrees/contract'
import { div, dynamicChild, span } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { cardFrame } from '../setup/card'
import type { ProposalModel } from './follow'

const shownLines = ({ copy, run }: SetupLines) => [...copy.map(path => `Copy ${path}`), ...run.map(command => `Run ${command}`)]

const line = (text: string) => span({ class: 'min-w-0 truncate', title: text }, text)

export const proposalCard = (ctx: WorkspaceContext, model: ProposalModel) => () => {
  const { kit } = ctx
  return cardFrame(
    span({ class: 'text-neutral-400' }, 'Set up new worktrees like this?'),
    dynamicChild(model.lines, lines => div({ class: 'flex flex-col pt-1 text-neutral-500' }, ...(lines ? shownLines(lines) : []).map(line))),
    div(
      { class: 'flex items-center gap-1 pt-1' },
      kit.secondaryAction(
        { size: 'sm', title: 'Saves .sand/worktree.toml and runs it here', disabled: model.answering, onClick: () => void model.answer('save') },
        'Save',
      ),
      kit.quietButton({ size: 'sm', disabled: model.answering, onClick: () => void model.answer('decline') }, 'Not now'),
    ),
  )
}
