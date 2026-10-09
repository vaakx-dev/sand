const sameShell = (a: Node, b: Node) => {
  if (a.nodeName !== b.nodeName || !(a instanceof Element) || !(b instanceof Element)) return false
  if (a.attributes.length !== b.attributes.length) return false
  return [...b.attributes].every(attribute => a.getAttribute(attribute.name) === attribute.value)
}

export const morph = (parent: Node, next: Node[]) => {
  next.forEach((node, index) => {
    const old = parent.childNodes[index]
    if (!old) return void parent.appendChild(node)
    if (old.isEqualNode(node)) return
    if (old.nodeType === Node.TEXT_NODE && node.nodeType === Node.TEXT_NODE) {
      old.nodeValue = node.nodeValue
      return
    }
    if (sameShell(old, node)) return morph(old, [...node.childNodes])
    parent.replaceChild(node, old)
  })
  while (parent.childNodes.length > next.length) parent.lastChild!.remove()
}
