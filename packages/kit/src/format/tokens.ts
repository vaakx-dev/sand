const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 3 })

export const tokens = (value: number) => compact.format(value).replace('K', 'k')
