"use client";

import { useCallback } from "react";
import { getDataStore } from "@/lib/db/datastore";
import { dropReportedFailure } from "@/lib/db/write-failure";

export function useCalendarActions() {
  const unscheduleNode = useCallback(async (id: string) => {
    const dataStore = await getDataStore();
    await dataStore.updateNode(id, { deadline: null, deadlineAllDay: false }).catch(dropReportedFailure);
  }, []);

  const unscheduleBit = useCallback(async (id: string) => {
    const dataStore = await getDataStore();
    await dataStore.updateBit(id, { deadline: null, deadlineAllDay: false }).catch(dropReportedFailure);
  }, []);

  const unscheduleChunk = useCallback(async (id: string) => {
    const dataStore = await getDataStore();
    await dataStore.updateChunk(id, { time: null }).catch(dropReportedFailure);
  }, []);

  return { unscheduleNode, unscheduleBit, unscheduleChunk };
}
