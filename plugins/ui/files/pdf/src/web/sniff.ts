type Sniffed = 'pdf' | 'web page' | 'other'

const HEADER_BYTES = 1024

const PDF_MARK = '%PDF-'

const WEB_PAGE = /^(?:\u00EF\u00BB\u00BF)?\s*<(?:!doctype html|html|head|body)[\s>]/i

const sniffed = (start: string): Sniffed => {
  if (start.includes(PDF_MARK)) return 'pdf'
  return WEB_PAGE.test(start) ? 'web page' : 'other'
}

const sniff = async (blob: Blob) => sniffed(new TextDecoder('latin1').decode(await blob.slice(0, HEADER_BYTES).arrayBuffer()))

export { sniff }
