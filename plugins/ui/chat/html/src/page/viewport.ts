const cssSource =
  /<!--[\s\S]*?(?:-->|$)|<style\b[^>]*(?:>|$)([\s\S]*?)(?:<\/style\s*>|$)|\sstyle\s*=\s*(?:"([^"]*)(?:"|$)|'([^']*)(?:'|$)|([^\s>]+))/gi

const viewportUnit = /(?<![\w.+/])(?:\d+(?:\.\d+)?|\.\d+)[sld]?vh(?![\w-])/i

export const rejectViewportUnits = (html: string) => {
  for (const [, sheet, doubleQuoted, singleQuoted, unquoted] of html.matchAll(cssSource)) {
    const found = viewportUnit.exec(sheet ?? doubleQuoted ?? singleQuoted ?? unquoted ?? '')?.[0]
    if (found) {
      throw new Error(
        `This page sizes something with ${found}, and viewport heights don't work in the frame. Let content set the height, or use fixed pixel heights.`,
      )
    }
  }
}
