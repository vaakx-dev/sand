import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'

export const toolSteps = ({ field }: ToolViews, nameOf: (login: string) => string | undefined): Record<string, ToolRenderer> => {
  const loginOf = (tool: ToolView) => nameOf(field(tool.call.input, 'login')) ?? 'a saved login'
  return {
    request_secret: { icon: 'key', verb: 'Asked for', activeVerb: 'Asking for', label: tool => field(tool.call.input, 'title') },
    login_fill: { icon: 'globe', verb: 'Signed in with', activeVerb: 'Signing in with', label: loginOf },
    login_code: { icon: 'shield', verb: 'Entered a sign-in code for', activeVerb: 'Getting a sign-in code for', label: loginOf },
    logins: { icon: 'key', verb: 'Listed', activeVerb: 'Listing', label: () => 'saved logins' },
  }
}
