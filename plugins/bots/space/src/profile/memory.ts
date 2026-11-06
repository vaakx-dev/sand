import { memoryChangeWire, memoryList, memoryName, memoryRead, memoryRemove, memoryWrite, type MemoryFile } from '@sand/bot-memory/contract'
import { ago, errorMessage } from '@sand/util'
import { derive, div, dynamicChild, effect, keys, show, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { confirmButton } from '../confirm'
import type { BotsContext } from '../context'

interface Memory {
  ctx: BotsContext
  bot: string
  files: Sig<MemoryFile[] | undefined>
  open: Sig<string | undefined>
  failure: Sig<string | undefined>
}

const attempt = (memory: Memory, work: () => Promise<unknown>) => {
  memory.failure.set(undefined)
  return work().catch(error => memory.failure.set(errorMessage(error)))
}

const changedNote = ({ linkButton }: BotsContext['kit'], reload: () => void) =>
  div({ class: 'flex flex-wrap items-center gap-2 text-xs text-neutral-400' }, span('The bot changed this file.'), linkButton({ onClick: reload }, 'Load its version'))

const fileEditor = (memory: Memory, file: Sig<MemoryFile>) => {
  const { ctx, bot } = memory
  const { loadingState, primaryAction, rowDetail, textArea } = ctx.kit
  const name = file.get().name
  const saved = sig<string | undefined>(undefined)
  const draft = sig('')
  const saving = sig(false)
  const changed = sig(false)
  let known = file.get().updated

  const load = () => {
    const at = file.get().updated
    return attempt(memory, () =>
      ctx.wire.call(memoryRead, { bot, name }).then(text => {
        known = at
        draft.set(text)
        saved.set(text)
        changed.set(false)
      }),
    )
  }
  void load()

  effect(() => {
    const at = file.get().updated
    untrack(() => {
      if (at === known || saving.get() || saved.get() === undefined) return
      if (draft.get() === saved.get()) void load()
      else changed.set(true)
    })
  })

  const save = () => {
    const text = draft.get()
    saving.set(true)
    void attempt(memory, () =>
      ctx.wire.call(memoryWrite, { bot, name, text }).then(files => {
        known = files.find(other => other.name === name)?.updated ?? known
        saved.set(text)
        changed.set(false)
        memory.files.set(files)
      }),
    ).finally(() => saving.set(false))
  }
  const remove = () =>
    attempt(memory, () =>
      ctx.wire.call(memoryRemove, { bot, name }).then(files => {
        memory.open.set(undefined)
        memory.files.set(files)
      }),
    )
  const loaded = derive(() => saved.get() !== undefined)
  return rowDetail(
    dynamicChild(loaded, ready => {
      if (!ready) return loadingState()
      return div(
        { class: 'flex flex-col gap-2' },
        textArea({ bindValue: draft, rows: 14, 'aria-label': name, class: 'font-mono' }),
        show(changed, () => changedNote(ctx.kit, () => void load())),
        div(
          { class: 'flex flex-wrap items-center justify-end gap-2' },
          confirmButton(ctx.kit, { label: 'Delete', confirm: `Delete ${name}`, run: remove }),
          primaryAction({ size: 'sm', disabled: () => saving.get() || draft.get() === saved.get(), onClick: save }, 'Save'),
        ),
      )
    }),
  )
}

const fileRow = (memory: Memory, file: Sig<MemoryFile>) => {
  const { listRow } = memory.ctx.kit
  const name = file.get().name
  const opened = () => memory.open.get() === name
  return div(
    { class: 'flex flex-col' },
    listRow({
      surface: 'group',
      touch: true,
      title: name,
      trail: () => ago(file.get().updated),
      expanded: opened,
      onClick: () => memory.open.set(opened() ? undefined : name),
    }),
    show(opened, () => fileEditor(memory, file)),
  )
}

const newFile = (memory: Memory, done: () => void) => {
  const { ctx, bot } = memory
  const { errorText, primaryAction, rowDetail, secondaryAction, textInput } = ctx.kit
  const name = sig('')
  const checked = derive(() => memoryName.safeParse(name.get()))
  const problem = derive(() => {
    const result = checked.get()
    return name.get() && !result.success ? result.error.issues[0]?.message : undefined
  })
  const create = () => {
    const result = checked.get()
    if (!result.success) return
    const known = memory.files.get()?.some(file => file.name === result.data)
    if (known) return memory.failure.set(`${result.data} already exists`)
    void attempt(memory, () =>
      ctx.wire.call(memoryWrite, { bot, name: result.data, text: '' }).then(files => {
        memory.files.set(files)
        memory.open.set(result.data)
        done()
      }),
    )
  }
  return rowDetail(
    div(
      { class: 'flex flex-wrap items-center gap-2 pt-3' },
      textInput({ bindValue: name, placeholder: 'notes.md', 'aria-label': 'File name', class: 'min-w-40 flex-1', onKeyDown: keys({ Enter: create }) }),
      secondaryAction({ size: 'sm', onClick: done }, 'Cancel'),
      primaryAction({ size: 'sm', disabled: () => !checked.get().success, onClick: create }, 'Create'),
    ),
    show(
      () => Boolean(problem.get()),
      () => errorText(() => problem.get() ?? ''),
    ),
  )
}

const listing = (memory: Memory) => {
  const { emptyState, loadingState, rowList } = memory.ctx.kit
  const state = derive(() => {
    const files = memory.files.get()
    if (!files) return 'loading'
    return files.length ? 'files' : 'empty'
  })
  return dynamicChild(state, shown => {
    if (shown === 'loading') return loadingState({ surface: 'group' })
    if (shown === 'empty') return emptyState({ surface: 'group', text: 'No memory yet.' })
    return rowList(
      memory.files.map(files => files ?? []),
      file => file.name,
      file => fileRow(memory, file),
    )
  })
}

export const memorySection = (ctx: BotsContext, bot: string) => {
  const { errorText, quietButton, rowDetail, settingsSection } = ctx.kit
  const memory: Memory = { ctx, bot, files: sig(undefined), open: sig(undefined), failure: sig(undefined) }
  const adding = sig(false)
  void attempt(memory, () => ctx.wire.call(memoryList, { bot }).then(files => memory.files.set(files)))
  const stop = ctx.wire.on(memoryChangeWire, ([changed, files]) => {
    if (changed === bot) memory.files.set(files)
  })
  return div(
    { class: 'contents', onMount: () => stop },
    settingsSection(
      { title: 'Memory', action: quietButton({ size: 'sm', onClick: () => adding.set(true) }, 'New file') },
      show(adding, () => newFile(memory, () => adding.set(false))),
      listing(memory),
      show(
        () => Boolean(memory.failure.get()),
        () => rowDetail(span({ class: 'pt-3' }, errorText(() => memory.failure.get() ?? ''))),
      ),
    ),
  )
}
