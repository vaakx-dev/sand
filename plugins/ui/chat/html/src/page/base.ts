export const baseCss = [
  'html{background:var(--background);color:var(--foreground);font-family:var(--font-sans);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;scrollbar-width:none}',
  'html::-webkit-scrollbar{display:none}',
  'body{margin:0}',
  'code,kbd,pre,samp{font-family:var(--font-mono)}',
  '[hidden]{display:none!important}',
  ':where(:focus-visible){outline:2px solid var(--ring);outline-offset:-2px}',
  ':where(img:not(a[href] img,button img)){cursor:zoom-in}',
].join('')
