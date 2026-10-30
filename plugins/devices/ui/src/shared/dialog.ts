export const alertDialog = (label: string, describedBy: string) => ({
  role: 'alertdialog',
  'aria-modal': 'true',
  'aria-label': label,
  'aria-describedby': describedBy,
  tabIndex: -1,
  class: 'outline-none',
  onMount: (node: HTMLElement) => node.focus(),
})
