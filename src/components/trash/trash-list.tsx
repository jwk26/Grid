"use client";

import { toastCopy } from "@/lib/copy/feedback";
import { showToast } from "@/lib/feedback/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTrashActions } from "@/hooks/use-trash-actions";
import { TrashGroup } from "@/components/trash/trash-group";
import type { Bit, Node } from "@/types";

type TrashItems = { nodes: Node[]; bits: Bit[] };

export function TrashList({ items }: { items: TrashItems }) {
  const { emptyTrash } = useTrashActions();
  const deletedNodeIds = new Set(items.nodes.map((node) => node.id));

  const groupedChildNodes = new Map<string, Node[]>();
  const groupedBits = new Map<string, Bit[]>();
  const topLevelNodes: Node[] = [];
  const standaloneBits: Bit[] = [];

  for (const node of items.nodes) {
    if (node.parentId !== null && deletedNodeIds.has(node.parentId)) {
      const siblings = groupedChildNodes.get(node.parentId) ?? [];
      siblings.push(node);
      groupedChildNodes.set(node.parentId, siblings);
    } else {
      topLevelNodes.push(node);
    }
  }

  for (const bit of items.bits) {
    if (deletedNodeIds.has(bit.parentId)) {
      const nodeBits = groupedBits.get(bit.parentId) ?? [];
      nodeBits.push(bit);
      groupedBits.set(bit.parentId, nodeBits);
    } else {
      standaloneBits.push(bit);
    }
  }

  const sortedTopLevelNodes = topLevelNodes.toSorted(
    (left, right) => (right.deletedAt ?? 0) - (left.deletedAt ?? 0),
  );
  const sortedStandaloneBits = standaloneBits.toSorted(
    (left, right) => (right.deletedAt ?? 0) - (left.deletedAt ?? 0),
  );

  async function handleEmptyTrash() {
    try {
      await emptyTrash();
      showToast(toastCopy.emptyTrashSucceeded);
    } catch {
      showToast(toastCopy.emptyTrashFailed);
    }
  }

  if (sortedTopLevelNodes.length === 0 && sortedStandaloneBits.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-card/50">
        <p className="text-sm text-muted-foreground">Trash is empty</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Empty trash</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete all items?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void handleEmptyTrash()}>
                Delete all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-3">
        {sortedTopLevelNodes.map((node) => (
          <TrashGroup
            key={node.id}
            childBits={(groupedBits.get(node.id) ?? []).toSorted(
              (left, right) => (right.deletedAt ?? 0) - (left.deletedAt ?? 0),
            )}
            childNodes={(groupedChildNodes.get(node.id) ?? []).toSorted(
              (left, right) => (right.deletedAt ?? 0) - (left.deletedAt ?? 0),
            )}
            kind="node"
            node={node}
          />
        ))}
        {sortedStandaloneBits.map((bit) => (
          <TrashGroup key={bit.id} bit={bit} kind="bit" />
        ))}
      </div>
    </div>
  );
}
