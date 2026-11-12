import type { Kit } from '@sand/ui-kit/contract'
import type { SheetSpec } from '@sand/ui-shell/contract'
import { div, dynamicChild, type Sig } from '@vaakx-dev/vrui'

export const subscribeSheet = (kit: Kit, link: Sig<string | undefined>): SheetSpec => ({
  label: 'Subscription link',
  title: 'Subscription link',
  body: () => [
    kit.secondaryText('Calendar apps on this computer or your own network can subscribe to this link and stay up to date. Anyone with the link can read the calendar.'),
    dynamicChild(link, url =>
      url
        ? div(
            { class: 'flex items-center gap-2' },
            kit.textInput({ value: url, readOnly: true, class: 'min-w-0 flex-1', 'aria-label': 'Link' }),
            kit.copyButton({ text: () => url, label: 'Copy link' }),
          )
        : kit.loadingState({ text: 'Making the link…', flush: true }),
    ),
  ],
})
