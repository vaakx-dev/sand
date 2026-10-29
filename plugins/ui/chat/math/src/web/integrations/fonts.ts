const common = ['1em KaTeX_Main', 'italic 1em KaTeX_Main', 'bold 1em KaTeX_Main', 'italic 1em KaTeX_Math', '1em KaTeX_Size1', '1em KaTeX_Size2']

let started = false

export const preloadMathFonts = () => {
  if (started) return
  started = true
  for (const font of common) void document.fonts.load(font).catch(() => undefined)
}
