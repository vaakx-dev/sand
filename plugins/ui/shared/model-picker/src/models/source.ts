export const sourceName = ({ label, via }: { label: string; via?: string }) => (via ? `${label} on ${via}` : label)
