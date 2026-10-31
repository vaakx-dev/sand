import type { BranchChanges } from './changes'

const shape = [
  'Without a template, the body is:',
  '<One sentence on what this PR does.>',
  '',
  '## What',
  '',
  '- <One change per line.>',
  '',
  '## Why',
  '',
  '- <One reason per line.>',
  '',
  '## Verification',
  '',
  '- <What was run and what it showed.>',
].join('\n')

export const textSystem = [
  'You write the title and body of one GitHub pull request for the branch you are shown.',
  'The title is `type(scope): what is now true`, under 60 characters in all. Example: fix(connection): web UI stays connected on slow links',
  'type is feat, fix, perf, refactor or revert. scope is the plugin or area the change is mainly in. After the colon, start lowercase and say the result, not the work; join two results with a semicolon.',
  'When the repository has a pull request template, fill in that template and keep its headings; drop HTML comments and instructions meant for the author.',
  shape,
  'List under Verification only checks the commits or diff show, such as added tests. If nothing shows how it was checked, leave out the Verification section.',
  'Write plain, short sentences in GitHub markdown. Never mention AI, models or assistants.',
  'Reply with JSON: {"title": string, "body": string}.',
].join('\n')

export const textPrompt = (branch: string, base: string, changes: BranchChanges, template: string | undefined) =>
  [
    `Branch ${branch} into ${base}.`,
    template ? `Pull request template:\n${template}` : 'The repository has no pull request template.',
    `Commits:\n${changes.commits}`,
    `Changed files:\n${changes.stat}`,
    `Diff${changes.truncated ? ' (cut short)' : ''}:\n${changes.patch}`,
  ].join('\n\n')
