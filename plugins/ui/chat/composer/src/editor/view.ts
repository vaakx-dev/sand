import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, effect, scoped, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { Completion } from '../complete/model'
import type { Records } from '../records'
import type { DrawChip } from './chips/widget'
import type { Mounted } from './codemirror'

export interface EditorKeys {
  keydown(event: KeyboardEvent): boolean
  keyup(event: KeyboardEvent): boolean
  paste(event: ClipboardEvent): boolean
  drop(event: DragEvent): boolean
}

export interface EditorParts {
  kit: Kit
  text: Sig<string>
  hint: () => HTMLElement
  keys: EditorKeys
  typed(): void
  completion: Completion
  records: Records
  chip: DrawChip
}

type Module = typeof import('./codemirror')

let loaded: Module | undefined
let loading: Promise<Module> | undefined

export const loadEditor = () =>
  (loading ??= import('./codemirror').then(module => {
    loaded = module
    return module
  }))

const insertedText = (event: InputEvent) => event.data ?? event.dataTransfer?.getData('text/plain') ?? ''

export const createEditor = (parts: EditorParts) => {
  const editorHint = parts.hint()
  const mounted = sig<Mounted | undefined>(undefined)
  const made = () => untrack(() => mounted.get())
  let early = ''
  let focused = false

  const mount = (module: Module) => {
    const existing = made()
    if (existing) return existing
    const doc = untrack(() => parts.text.get()) + early
    early = ''
    const editor = untrack(() => module.mountEditor({ ...parts, hint: () => editorHint }, doc))
    mounted.set(editor)
    if (focused) editor.focusEnd()
    return editor
  }

  const ready = () => made() ?? (loaded && mount(loaded))

  const run = (act: (editor: Mounted) => void) => {
    const editor = ready()
    if (editor) return act(editor)
    void loadEditor().then(module => act(mount(module)))
  }

  const wake = () => {
    focused = true
    run(editor => editor.focus())
  }

  const hold = (event: InputEvent) => {
    if (made()) return
    event.preventDefault()
    early += insertedText(event)
  }

  const standIn = div(
    {
      class: 'text-neutral-500 outline-none',
      contentEditable: 'true',
      role: 'textbox',
      'aria-label': 'Message',
      'aria-multiline': 'true',
      onFocus: wake,
      onBlur: () => (focused = false),
      onBeforeInput: hold,
    },
    parts.hint(),
  )
  const node = div(
    { class: 'text-neutral-100 leading-relaxed' },
    dynamicChild(mounted, editor => editor?.dom ?? standIn),
  )
  void loadEditor()
  scoped(() => made()?.destroy())

  effect(() => {
    const value = parts.text.get()
    const editor = made()
    if (editor) return editor.show(value)
    if (value) run(created => created.show(untrack(() => parts.text.get())))
  })

  return {
    node,
    focus: () => run(editor => editor.focus()),
    focusEnd: () => run(editor => editor.focusEnd()),
    replace: (value: string) => run(editor => editor.replace(value)),
    insert: (value: string) => run(editor => editor.insert(value)),
    insertWords: (value: string) => run(editor => editor.insertWords(value)),
    quote: (value: string) => run(editor => editor.quote(value)),
    reference: (link: string) => run(editor => editor.reference(link)),
  }
}
