import { GRID_COLS, GRID_ROWS } from "@/lib/constants";

// One table of boundary values per field rule. `schema.test.ts` runs it against the Zod
// schemas and `supabase/tests/constraints.db.test.ts` against the database CHECK
// constraints, so both must give the same verdict (S12, S33).

export type BoundaryEntity = "node" | "bit" | "chunk" | "scratchBreakdown" | "stagedCandidate";

export type BoundaryCase = {
  entity: BoundaryEntity;
  field: string;
  value: unknown;
  valid: boolean;
  label: string;
};

const ID_1 = "00000000-0000-4000-8000-000000000001";
const ID_2 = "00000000-0000-4000-8000-000000000002";
const ID_3 = "00000000-0000-4000-8000-000000000003";

// A fully valid entity per kind (camelCase, as the Zod schemas see it). `parentId` and the
// other references are placeholders; the database test replaces them with real parents.
export const baseEntities = {
  node: {
    id: ID_1,
    title: "Node",
    color: "hsl(210, 80%, 55%)",
    icon: "folder",
    deadline: null,
    deadlineAllDay: false,
    mtime: 1,
    createdAt: 1,
    version: 1,
    parentId: null,
    level: 0,
    x: 0,
    y: 0,
    deletedAt: null,
    archivedAt: null,
    systemRole: null,
    hiddenFromGrid: false,
    pastDeadlineDismissed: false,
  },
  bit: {
    id: ID_2,
    title: "Bit",
    description: "",
    icon: "check",
    deadline: null,
    deadlineAllDay: false,
    priority: null,
    status: "active",
    mtime: 1,
    createdAt: 1,
    version: 1,
    parentId: ID_1,
    x: 0,
    y: 0,
    deletedAt: null,
    archivedAt: null,
    pastDeadlineDismissed: false,
  },
  chunk: {
    id: ID_3,
    title: "Chunk",
    description: "",
    time: null,
    timeAllDay: false,
    status: "incomplete",
    order: 0,
    parentId: ID_2,
  },
  scratchBreakdown: {
    id: ID_3,
    scratchBitId: ID_2,
    content: "Idea",
    order: 0,
    createdAt: 1,
    consumedAt: null,
    version: 1,
  },
  stagedCandidate: {
    id: ID_1,
    scratchBitId: ID_2,
    sourceBreakdownId: ID_3,
    resultType: "node",
    lifecycle: "staged",
    createdAt: 1,
    updatedAt: 1,
    version: 1,
  },
} as const satisfies Record<BoundaryEntity, Record<string, unknown>>;

function c(
  entity: BoundaryEntity,
  field: string,
  value: unknown,
  valid: boolean,
  label: string,
): BoundaryCase {
  return { entity, field, value, valid, label };
}

// Zod counts UTF-16 code units; Postgres `char_length` counts code points. An astral
// character (one code point) is two code units, so these cases catch a length mismatch.
const astral = "\u{1F600}";

function lengthCases(
  entity: BoundaryEntity,
  field: string,
  min: number,
  max: number,
): BoundaryCase[] {
  const cases: BoundaryCase[] = [];
  if (min > 0) cases.push(c(entity, field, "a".repeat(min - 1), false, `${field} below min`));
  cases.push(c(entity, field, "a".repeat(min), true, `${field} at min`));
  cases.push(c(entity, field, "a".repeat(max), true, `${field} at max`));
  cases.push(c(entity, field, "a".repeat(max + 1), false, `${field} above max`));
  cases.push(
    c(entity, field, astral.repeat(max / 2), true, `${field} astral at max (UTF-16 units)`),
    c(entity, field, astral.repeat(max / 2 + 1), false, `${field} astral above max`),
  );
  return cases;
}

function rangeCases(
  entity: BoundaryEntity,
  field: string,
  min: number,
  max: number | null,
): BoundaryCase[] {
  const cases = [
    c(entity, field, min - 1, false, `${field} below min`),
    c(entity, field, min, true, `${field} at min`),
  ];
  if (max !== null) {
    cases.push(
      c(entity, field, max, true, `${field} at max`),
      c(entity, field, max + 1, false, `${field} above max`),
    );
  }
  return cases;
}

function enumCases(
  entity: BoundaryEntity,
  field: string,
  allowed: string[],
  nullable: boolean,
): BoundaryCase[] {
  const cases = allowed.map((value) => c(entity, field, value, true, `${field} ${value}`));
  cases.push(c(entity, field, "other", false, `${field} unknown value`));
  cases.push(c(entity, field, null, nullable, `${field} null`));
  return cases;
}

const COLOR_CASES: BoundaryCase[] = [
  c("node", "color", "hsl(210, 80%, 55%)", true, "color canonical"),
  c("node", "color", "hsl(0,0%,0%)", true, "color without spaces"),
  c("node", "color", "hsl(999, 999%, 999%)", true, "color three digits at max"),
  c("node", "color", "hsl(1000, 80%, 55%)", false, "color four digits"),
  c("node", "color", "hsl(210, 80, 55%)", false, "color missing percent"),
  c("node", "color", "rgb(1, 2, 3)", false, "color other function"),
  c("node", "color", "hsl(210, 80%, 55%) ", false, "color trailing space"),
  c("node", "color", "hsl(210, 80%, 55%)", true, "color NBSP counts as \\s in JS"),
  c("node", "color", "hsl(210,　 80%, 55%)", true, "color ideographic space counts as \\s"),
  c("node", "color", "hsl(١٢٣, 80%, 55%)", false, "color Arabic-Indic digits"),
  c("node", "color", "hsl(210, ８０%, 55%)", false, "color fullwidth digits"),
];

export const boundaryCases: BoundaryCase[] = [
  // nodes
  ...lengthCases("node", "title", 1, 100),
  ...COLOR_CASES,
  ...lengthCases("node", "icon", 1, 64),
  ...rangeCases("node", "level", 0, 2),
  ...rangeCases("node", "x", 0, GRID_COLS - 1),
  ...rangeCases("node", "y", 0, GRID_ROWS - 1),
  ...rangeCases("node", "version", 1, null),
  ...rangeCases("node", "mtime", 1, null),
  ...rangeCases("node", "createdAt", 1, null),
  ...enumCases("node", "systemRole", ["inbox", "archive_view"], true),
  c("node", "deadline", 0, false, "deadline zero"),
  c("node", "deadline", 1, true, "deadline one"),
  c("node", "deletedAt", 0, false, "deletedAt zero"),
  c("node", "archivedAt", 0, false, "archivedAt zero"),
  // bits
  ...lengthCases("bit", "title", 1, 200),
  ...lengthCases("bit", "description", 0, 1000),
  ...lengthCases("bit", "icon", 1, 64),
  ...enumCases("bit", "priority", ["high", "mid", "low"], true),
  ...enumCases("bit", "status", ["active", "complete"], false),
  ...rangeCases("bit", "x", 0, GRID_COLS - 1),
  ...rangeCases("bit", "y", 0, GRID_ROWS - 1),
  ...rangeCases("bit", "version", 1, null),
  ...rangeCases("bit", "mtime", 1, null),
  ...rangeCases("bit", "createdAt", 1, null),
  c("bit", "deadline", 0, false, "deadline zero"),
  c("bit", "deletedAt", 0, false, "deletedAt zero"),
  c("bit", "archivedAt", 0, false, "archivedAt zero"),
  // chunks
  ...lengthCases("chunk", "title", 1, 200),
  ...lengthCases("chunk", "description", 0, 500),
  ...enumCases("chunk", "status", ["complete", "incomplete"], false),
  ...rangeCases("chunk", "order", 0, null),
  c("chunk", "time", 0, false, "time zero"),
  // scratch breakdowns
  ...lengthCases("scratchBreakdown", "content", 1, 1000),
  ...rangeCases("scratchBreakdown", "order", 0, null),
  ...rangeCases("scratchBreakdown", "version", 1, null),
  ...rangeCases("scratchBreakdown", "createdAt", 1, null),
  c("scratchBreakdown", "consumedAt", 0, false, "consumedAt zero"),
  // staged candidates
  ...enumCases("stagedCandidate", "resultType", ["node", "bit"], false),
  c("stagedCandidate", "lifecycle", "staged", true, "lifecycle staged"),
  c("stagedCandidate", "lifecycle", "placed", false, "lifecycle other"),
  ...rangeCases("stagedCandidate", "version", 1, null),
  ...rangeCases("stagedCandidate", "createdAt", 1, null),
  ...rangeCases("stagedCandidate", "updatedAt", 1, null),
];
