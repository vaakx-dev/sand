const sameShell = (a: Node, b: Node) => {
  if (a.nodeName !== b.nodeName || !(a instanceof Element) || !(b instanceof Element)) return false
  if (a.attributes.length !== b.attributes.length) return false
  return [...b.attributes].every(attribute => a.getAttribute(attribute.name) === attribute.value)
}

const leaf = (node: Node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE

export const morph = (parent: Node, next: Node[], offset = 0) => {
  next.forEach((node, index) => {
    const old = parent.childNodes[offset + index]
    if (!old) return void parent.appendChild(node)
    if (leaf(old) && old.nodeType === node.nodeType) {
      if (old.nodeValue !== node.nodeValue) old.nodeValue = node.nodeValue
      return
    }
    if (sameShell(old, node)) return morph(old, [...node.childNodes])
    parent.replaceChild(node, old)
  })
  while (parent.childNodes.length > offset + next.length) parent.lastChild!.remove()
}
