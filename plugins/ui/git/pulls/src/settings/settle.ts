import { type PullsContext, toastId } from '../inject'

const title = 'Settle threads when their PR merges'

export const settleSection = ({ kit, pullLinks, toasts }: PullsContext) => {
  const flip = () => toasts.attempt(toastId, "Couldn't change auto-settle on every PC", () => pullLinks.setAutoSettle(!pullLinks.autoSettle()))
  return kit.settingsSection(
    { title: 'Threads' },
    kit.settingsRow(
      { title, detail: 'Once all its pull requests merge or close, a thread moves to Settled, unless you wrote in it since.' },
      kit.toggleSwitch({ on: () => pullLinks.autoSettle(), 'aria-label': title, onClick: () => void flip() }),
    ),
  )
}
