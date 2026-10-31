import type { Preview } from './preview'

export const messageSystem = [
  'You write one git commit message for the staged changes you are shown.',
  'The title is `type(scope): what is now true`, in lower case, without a trailing period, under 72 characters. Describe the result, not the work. Example: fix(auth): repeated failed logins pause sign-in',
  'Types: feat (new functionality), fix (bug fix), refactor (restructuring without behavior changes), perf, docs, test, style (code formatting, not UI design), build (build tooling or dependencies), ci, chore (other maintenance), revert.',
  "The title is usually enough. Add bullets only for what the diff doesn't show, such as why or a side effect; otherwise return no bullets.",
  'Follow the scopes, wording and tone of the recent commit subjects.',
  'Never mention AI, models or assistants, and add no trailers such as Co-authored-by.',
  'Reply with JSON: {"title": string, "bullets": string[]}.',
].join('\n')

export const messagePrompt = (preview: Preview, subjects: string[]) =>
  [
    subjects.length ? `Recent commit subjects:\n${subjects.join('\n')}` : 'This is the first commit in the repository.',
    `Changed files:\n${preview.stat}`,
    `Diff${preview.truncated ? ' (cut short)' : ''}:\n${preview.patch}`,
  ].join('\n\n')
