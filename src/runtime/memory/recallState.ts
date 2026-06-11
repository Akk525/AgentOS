const lastRecallByNode = new Map<string, number>()

export function setLastRecall(nodeId: string, count: number): void {
  lastRecallByNode.set(nodeId, count)
}

export function getLastRecall(nodeId: string): number {
  return lastRecallByNode.get(nodeId) ?? 0
}

export function clearLastRecall(nodeId?: string): void {
  if (nodeId) {
    lastRecallByNode.delete(nodeId)
    return
  }
  lastRecallByNode.clear()
}
