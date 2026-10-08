export const mono = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
export const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", sans-serif'
export const EASE = 'cubic-bezier(.32,.72,0,1)'

export const color = (role: string, shade: number | string) => `var(--vrui-color-${role}-${shade})`
