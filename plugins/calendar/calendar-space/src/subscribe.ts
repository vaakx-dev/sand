import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, p } from '@vaakx-dev/vrui'
import type { Sig } from '@vaakx-dev/vrui'

export const subscribeSheet = (kit: Kit, link: Sig<string | undefined>, close: () => void) =>
  kit.overlay(
    close,
    kit.sheet(
      { size: 'sm', 'aria-label': 'Subscription link' },
      kit.sheetHead({ title: 'Subscription link', close }),
      kit.sheetBody(
        {},
        kit.sheetText('Calendar apps on this computer or your own network can subscribe to this link and stay up to date. Anyone with the link can read the calendar.'),
        dynamicChild(link, url =>
          url
            ? div(
                { class: 'flex items-center gap-2' },
                kit.textInput({ value: url, readOnly: true, class: 'min-w-0 flex-1', 'aria-label': 'Link' }),
                kit.copyButton({ text: () => url, label: 'Copy link' }),
              )
            : p({ class: 'text-sm text-neutral-500' }, 'Making the link…'),
        ),
      ),
    ),
  )
