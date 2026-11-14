import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, keys, sig } from '@vaakx-dev/vrui'
import type { VoiceModel } from '../model'

interface CloudLinks {
  saved(): void
  accounts(): void
}

const cloudForm = (kit: Kit, model: VoiceModel, { saved, accounts }: CloudLinks) => {
  const name = sig(model.state.get()?.model ?? '')
  const busy = sig(false)
  const error = sig('')
  const url = derive(() => model.state.get()?.openai?.url)
  const ready = () => !busy.get() && Boolean(name.get().trim())

  const save = async () => {
    if (!ready()) return
    busy.set(true)
    error.set('')
    try {
      await model.use({ destination: 'cloud', model: name.get().trim() })
      saved()
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  const noKey = () =>
    kit.banner({
      tone: 'warning',
      title: 'Add an OpenAI API key in Settings › Accounts first',
      detail: 'Voice uses the key and address you saved there. Give it the address of another OpenAI-style service, like Groq, to use that service instead.',
      actions: [kit.secondaryAction({ onClick: accounts }, 'Open Accounts')],
    })

  const form = (address: string) =>
    div(
      { class: 'flex flex-col gap-4' },
      kit.field({ label: 'Model' }, kit.textInput({ bindValue: name, placeholder: 'gpt-4o-mini-transcribe', onKeyDown: keys({ Enter: () => void save() }) })),
      kit.errorText(() => error.get()),
      div({ class: 'flex' }, kit.primaryAction({ disabled: () => !ready(), onClick: () => void save() }, 'Save and use')),
      kit.secondaryText(`Each recording goes to ${address} when you stop speaking, with the OpenAI key from Accounts, and is billed to that account.`),
    )

  return kit.pageSection({ title: 'Cloud service' }, dynamicChild(url, address => (address ? form(address) : noKey())))
}

export { cloudForm }
