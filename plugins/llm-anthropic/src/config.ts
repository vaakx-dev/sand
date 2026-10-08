import { z } from 'zod'
import { defaultModels } from './models'

export const config = z.object({
  base_url: z.string().default('https://api.anthropic.com'),
  api_key: z.string().optional(),
  models: z.array(z.string()).min(1).default(defaultModels),
  max_tokens: z.number().int().positive().default(64_000),
  thinking: z.enum(['summarized', 'omitted']).optional(),
  eager_input_streaming: z.boolean().default(false),
  max_retries: z.number().int().min(0).default(4),
})

export type AnthropicConfig = z.output<typeof config>
