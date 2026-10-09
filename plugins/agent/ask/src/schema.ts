import { z } from 'zod'

const listed = new Set(['single', 'multi', 'rank'])

const option = z.object({
  label: z.string().min(1).max(80).describe('1-5 words'),
  description: z.string().max(200).optional().describe('What picking this means or costs'),
  preview: z.string().max(2000).optional().describe('Code or text shown beside the options while this one is focused, for comparing concrete snippets'),
  recommended: z.boolean().optional().describe('At most one per question; list it first'),
})

const question = z
  .object({
    name: z.string().min(1).max(20).describe('Short label for the header, 1-2 words'),
    question: z.string().min(1).max(300),
    type: z
      .enum(['single', 'multi', 'confirm', 'rank', 'text'])
      .default('single')
      .describe('single: pick one. multi: pick any. confirm: yes or no. rank: put the options in order. text: a free answer, no options.'),
    options: z
      .array(option)
      .max(6)
      .default([])
      .describe('2-6 for single, multi and rank. For confirm, optionally the yes and no labels, in that order. None for text.'),
    detail: z.string().max(1000).optional().describe('The exact command, path or snippet the question is about, shown in monospace'),
    risky: z.boolean().optional().describe('confirm only: saying yes is destructive or hard to undo'),
  })
  .superRefine((value, issues) => {
    if (listed.has(value.type) && value.options.length < 2) issues.addIssue({ code: 'custom', path: ['options'], message: `${value.type} questions need at least 2 options` })
    if (value.type === 'confirm' && value.options.length && value.options.length !== 2) issues.addIssue({ code: 'custom', path: ['options'], message: 'confirm takes exactly 2 options (yes, no) or none' })
  })

export const askInput = z.object({ questions: z.array(question).min(1).max(4) })

export const answersInput = z.array(z.object({ picked: z.array(z.number().int().min(0)).max(6).optional(), text: z.string().max(20_000).optional() })).max(4).nullable()
