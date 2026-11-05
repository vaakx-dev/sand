import type { AgentAccess, AgentPairing, ShareLink } from '@sand/devices-contract'
import { errorMessage, oneLine } from '@sand/util'
import { div, dynamicChild, keys, sig } from '@vaakx-dev/vrui'
import { copyBox, field, note } from '../shared/parts'
import type { Ui } from '../ui'

const reachWords: Record<ShareLink['route']['kind'], string> = {
  tailscale: 'From your other machines over Tailscale',
  lan: 'From machines on your home network',
  local: 'From this PC only',
}

const claudeCommand = (url: string, token: string) => `claude mcp add --transport http sand ${url} --header "Authorization: Bearer ${token}"`

const madeView = (ui: Ui, { device, token, links }: AgentPairing) => {
  const [best] = links
  return div(
    { class: 'flex flex-col gap-4' },
    ui.kit.sheetText(`Give ${device.name} the URL and token. The token is shown only now; remove the agent to revoke it.`),
    ...links.map(link => field(reachWords[link.route.kind], copyBox(ui.kit, link.url))),
    field('Token', copyBox(ui.kit, token)),
    best ? field('For Claude Code, run', copyBox(ui.kit, claudeCommand(best.url, token))) : null,
  )
}

const formView = (ui: Ui, made: (pairing: AgentPairing) => void) => {
  const { errorText, primaryAction, segmented, sheetText, textInput } = ui.kit
  const name = sig('')
  const access = sig<AgentAccess>('read')
  const error = sig('')
  const busy = sig(false)

  const create = async () => {
    const chosen = oneLine(name.get()).trim()
    if (!chosen || busy.get()) return
    busy.set(true)
    error.set('')
    try {
      made(await ui.data.devices.addAgent(chosen, access.get()))
    } catch (failure) {
      error.set(`Couldn’t add the agent: ${errorMessage(failure)}`)
      busy.set(false)
    }
  }

  return div(
    { class: 'flex flex-col gap-4' },
    sheetText('An agent such as Claude Code or Codex on another machine can use your threads over MCP with its own token.'),
    field(
      'Name',
      textInput({ placeholder: 'Claude Code on the laptop', 'aria-label': 'Name', bindValue: name, onKeyDown: keys({ Enter: () => void create() }) }),
    ),
    field(
      'It may',
      segmented(
        [
          { value: 'read' as const, label: 'Read threads' },
          { value: 'operate' as const, label: 'Start and message threads' },
        ],
        access,
        value => access.set(value),
        { inset: true, fill: true, label: 'What the agent may do' },
      ),
      note('Either way it works on all your PCs.'),
    ),
    dynamicChild(error, text => (text ? errorText(text) : null)),
    primaryAction({ disabled: () => busy.get() || !name.get().trim(), onClick: () => void create() }, 'Add agent'),
  )
}

export const agentSheet = (ui: Ui, close: () => void) => {
  const { overlay, primaryAction, sheet, sheetBody, sheetFoot, sheetHead } = ui.kit
  const pairing = sig<AgentPairing | undefined>(undefined)
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Add an agent', size: 'md' },
      sheetHead({ title: () => (pairing.get() ? 'Agent added' : 'Add an agent'), close }),
      sheetBody(
        {},
        dynamicChild(pairing, made => (made ? madeView(ui, made) : formView(ui, next => pairing.set(next)))),
      ),
      dynamicChild(pairing, made => (made ? sheetFoot(primaryAction({ onClick: close }, 'Done')) : null)),
    ),
  )
}
