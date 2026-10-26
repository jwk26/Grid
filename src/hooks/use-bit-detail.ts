"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { liveRead } from "@/lib/db/datastore";
import type { Bit, Chunk, Node } from "@/types";

type BitDetailState = {
  bitId: string | null;
  bit: Bit | null;
  chunks: Chunk[];
  parentNode: Node | null;
};

const INITIAL_BIT_DETAIL: BitDetailState = {
  bitId: null,
  bit: null,
  chunks: [],
  parentNode: null,
};

export function useBitDetail(): {
  bit: Bit | null;
  chunks: Chunk[];
  parentNode: Node | null;
  isOpen: boolean;
  close: () => void;
} {
  const [state, setState] = useState<BitDetailState>(INITIAL_BIT_DETAIL);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const bitId = searchParams.get("bit");
  const isOpen = bitId !== null;

  useEffect(() => {
    if (!bitId) {
      return;
    }

    const subscription = liveRead(async (dataStore) => {
      const [bit, chunks] = await Promise.all([
        dataStore.getBit(bitId),
        dataStore.getChunks(bitId),
      ]);
      const parentNode = bit ? await dataStore.getNode(bit.parentId) : undefined;
      return [bit, chunks, parentNode] as const;
    }).subscribe({
      next: ([bit, chunks, parentNode]) => {
        setState({
          bitId,
          bit: bit ?? null,
          chunks,
          parentNode: parentNode ?? null,
        });
      },
      error: (error) => {
        console.error("liveQuery error:", error);
      },
    });

    return () => subscription.unsubscribe();
  }, [bitId]);

  const close = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("bit");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  if (!bitId || state.bitId !== bitId) {
    return {
      bit: null,
      chunks: [],
      parentNode: null,
      isOpen,
      close,
    };
  }

  return {
    bit: state.bit,
    chunks: state.chunks,
    parentNode: state.parentNode,
    isOpen,
    close,
  };
}
