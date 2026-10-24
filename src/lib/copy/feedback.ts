// Toast, app-state and blocking copy (SPEC §Feedback copy). Later tasks add
// their sentences here.

/**
 * `target` is the Node whose Grid receives the item: the current Node, the
 * parent chosen for a Bit created from L0, or `Home` for a Node created at L0.
 */
export function createDialogNoEmptyCell(target: string): string {
  return `“${target}” has no empty cell. Move or delete an item to make room.`;
}
