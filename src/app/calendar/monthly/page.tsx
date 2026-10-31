"use client";

import { MonthGrid } from "@/app/calendar/monthly/_components/month-grid";

import { useDocumentTitle } from "@/hooks/use-document-title";

export default function MonthlyCalendarPage() {
  useDocumentTitle("Calendar");
  return <MonthGrid />;
}
