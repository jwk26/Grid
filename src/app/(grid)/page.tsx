"use client";

import { useState } from "react";
import { EditNodeDialog } from "@/components/grid/edit-node-dialog";
import { GridView } from "@/components/grid/grid-view";
import { OnboardingHints } from "@/components/grid/onboarding-hints";
import { useAddFlow } from "@/components/layout/add-flow-context";
import { useDeleteFlow } from "@/components/layout/grid-runtime";
import { APP_NAME } from "@/lib/constants";
import type { Node } from "@/types";

export default function HomePage() {
  const { openAddAtCell } = useAddFlow();
  const { requestDelete } = useDeleteFlow();
  const [editingNode, setEditingNode] = useState<Node | null>(null);

  return (
    <>
      <h1 className="sr-only">{APP_NAME}</h1>
      <GridView
        level={0}
        onAddAtCell={openAddAtCell}
        onDelete={requestDelete}
        onNodeEditClick={setEditingNode}
        parentId={null}
      />
      <OnboardingHints />
      <EditNodeDialog
        level={editingNode?.level ?? 0}
        node={editingNode}
        onOpenChange={(open) => {
          if (!open) setEditingNode(null);
        }}
        open={editingNode !== null}
      />
    </>
  );
}
