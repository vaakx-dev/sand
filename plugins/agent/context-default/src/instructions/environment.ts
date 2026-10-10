export const environment = (cwd: string, notes: string[] = [], model?: string) =>
  [
    '# Environment\n',
    ...(model ? [`- Model: ${model}`] : []),
    `- Working directory: ${cwd}`,
    `- Platform: ${process.platform}`,
    ...notes.map(note => `- ${note}`),
    `- Date: ${new Date().toISOString().slice(0, 10)}`,
  ].join('\n')
