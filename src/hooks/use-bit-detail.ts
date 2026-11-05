"use client";

import { useEffect, useRef, useState } from "react";
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
  /** The read is done and the Bit is missing, in Trash or archived (ST31). */
  unavailable: boolean;
  close: () => void;
} {
  const [state, setState] = useState<BitDetailState>(INITIAL_BIT_DETAIL);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const bitId = searchParams.get("bit");
  const isOpen = bitId !== null;
  // The bit id whose removal from the URL has been started, so it runs once per id.
  const settledBitId = useRef<string | null>(null);
  const readDone = bitId !== null && state.bitId === bitId;
  const unavailable =
    readDone && (state.bit === null || state.bit.deletedAt !== null || state.bit.archivedAt !== null);

  useEffect(() => {
    if (bitId === null) settledBitId.current = null;
  }, [bitId]);

  useEffect(() => {
    if (!unavailable || bitId === null || settledBitId.current === bitId) return;
    settledBitId.current = bitId;
    removeBitParam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unavailable, bitId]);

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

    // A read counts only for the subscription that made it: the popup stays mounted after
    // `?bit=` leaves, so a stored read of the same id must not judge a reopened Bit.
    return () => {
      subscription.unsubscribe();
      setState(INITIAL_BIT_DETAIL);
    };
  }, [bitId]);

  function removeBitParam() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("bit");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  // The popup's own close also settles the id: a Bit it moved to Trash reads as trashed next, and
  // must not start a second navigation (or reopen if the write rolls back).
  const close = () => {
    settledBitId.current = bitId;
    removeBitParam();
  };

  if (!bitId || state.bitId !== bitId) {
    return {
      bit: null,
      chunks: [],
      parentNode: null,
      isOpen,
      unavailable: false,
      close,
    };
  }

  return {
    bit: state.bit,
    chunks: state.chunks,
    parentNode: state.parentNode,
    isOpen,
    unavailable,
    close,
  };
}
