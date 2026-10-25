import { describe, expect, it } from "vitest";
import { GRID_COLS, GRID_ROWS } from "@/lib/constants";
import { baseEntities, boundaryCases } from "@/lib/db/boundary-cases";
import * as dbSchema from "@/lib/db/schema";
import {
  createBitSchema,
  createChunkSchema,
  createNodeSchema,
  bitSchema,
  chunkSchema,
  createScratchBreakdownSchema,
  nodeSchema,
  scratchBreakdownSchema,
  stagedCandidateSchema,
} from "@/lib/db/schema";
import type {
  CandidateOrphanAuditEvent,
  PendingOperationRecovery,
  RepositoryOperationCommand,
  RepositoryOperationId,
  RepositoryOperationResult,
  RepositoryOperationStatus,
  StagedCandidate,
  UnknownRepositoryOperationOutcome,
} from "@/types";

type RuntimeSchema = {
  parse(input: unknown): Record<string, unknown>;
  safeParse(input: unknown): { success: boolean };
};

function getExportedSchema(name: string): RuntimeSchema {
  const value = (dbSchema as Record<string, unknown>)[name];
  expect(value, `${name} must be exported`).toBeDefined();
  return value as RuntimeSchema;
}

const publicTypeExports:
  | [
      RepositoryOperationId,
      RepositoryOperationStatus,
      RepositoryOperationCommand,
      RepositoryOperationResult,
      UnknownRepositoryOperationOutcome,
      StagedCandidate,
      CandidateOrphanAuditEvent,
      PendingOperationRecovery,
    ]
  | undefined = undefined;
void publicTypeExports;

const typecheckOperationId = crypto.randomUUID();
const typecheckBaseCommand: RepositoryOperationCommand = {
  operationId: typecheckOperationId,
};
const typecheckBaseResult: RepositoryOperationResult = {
  operationId: typecheckOperationId,
  status: "applied",
};
type TypecheckEvidenceResult =
  | { status: "applied"; entityId: string }
  | { status: "rejected"; reason: string };
const typecheckAppliedResult: RepositoryOperationResult<TypecheckEvidenceResult> = {
  operationId: typecheckOperationId,
  status: "applied",
  entityId: crypto.randomUUID(),
};
const typecheckRejectedResult: RepositoryOperationResult<TypecheckEvidenceResult> = {
  operationId: typecheckOperationId,
  status: "rejected",
  reason: "stale precondition",
};
// @ts-expect-error An applied result must retain its authoritative evidence.
const typecheckMissingEvidence: RepositoryOperationResult<TypecheckEvidenceResult> = {
  operationId: typecheckOperationId,
  status: "applied",
};
void [
  typecheckBaseCommand,
  typecheckBaseResult,
  typecheckAppliedResult,
  typecheckRejectedResult,
  typecheckMissingEvidence,
];

describe("schema", () => {
  it("applies defaults for node creation payloads", () => {
    const parsed = createNodeSchema.parse({
      title: "Inbox",
      color: "hsl(210, 80%, 55%)",
      icon: "inbox",
      parentId: null,
      level: 0,
      x: 2,
      y: 3,
    });

    expect(parsed).toEqual({
      title: "Inbox",
      color: "hsl(210, 80%, 55%)",
      icon: "inbox",
      deadline: null,
      deadlineAllDay: false,
      parentId: null,
      level: 0,
      x: 2,
      y: 3,
    });
  });

  it("rejects invalid node color and out-of-range coordinates", () => {
    expect(() =>
      createNodeSchema.parse({
        title: "Inbox",
        color: "#ffffff",
        icon: "inbox",
        parentId: null,
        level: 0,
        x: 0,
        y: 0,
      }),
    ).toThrow();

    expect(() =>
      nodeSchema.parse({
        id: crypto.randomUUID(),
        title: "Inbox",
        color: "hsl(210, 80%, 55%)",
        icon: "inbox",
        deadline: null,
        deadlineAllDay: false,
        mtime: Date.now(),
        createdAt: Date.now(),
        version: 1,
        parentId: null,
        level: 0,
        x: GRID_COLS,
        y: 0,
        deletedAt: null,
      }),
    ).toThrow();
  });

  it("applies lifecycle defaults for stored nodes", () => {
    const timestamp = Date.now();
    const parsed = nodeSchema.parse({
      id: crypto.randomUUID(),
      title: "Inbox",
      color: "hsl(210, 80%, 55%)",
      icon: "inbox",
      deadline: null,
      deadlineAllDay: false,
      mtime: timestamp,
      createdAt: timestamp,
      version: 1,
      parentId: null,
      level: 0,
      x: 2,
      y: 3,
      deletedAt: null,
    });

    expect(parsed.archivedAt).toBeNull();
    expect(parsed.systemRole).toBeNull();
    expect(parsed.hiddenFromGrid).toBe(false);
    expect(parsed.pastDeadlineDismissed).toBe(false);
  });

  it("strips system-managed node lifecycle fields from creation payloads", () => {
    const parsed = createNodeSchema.parse({
      title: "Inbox",
      color: "hsl(210, 80%, 55%)",
      icon: "inbox",
      parentId: null,
      level: 0,
      x: 2,
      y: 3,
      systemRole: "inbox",
      hiddenFromGrid: true,
      archivedAt: 123,
    });

    expect(parsed).not.toHaveProperty("systemRole");
    expect(parsed).not.toHaveProperty("hiddenFromGrid");
    expect(parsed).not.toHaveProperty("archivedAt");
  });

  it("applies defaults for bit and chunk creation payloads", () => {
    const parentId = crypto.randomUUID();
    const bit = createBitSchema.parse({
      title: "Write tests",
      icon: "pen",
      parentId,
      x: 1,
      y: 4,
    });
    const chunk = createChunkSchema.parse({
      title: "Cover the happy path",
      parentId: crypto.randomUUID(),
      order: 0,
    });

    expect(bit).toEqual({
      title: "Write tests",
      description: "",
      icon: "pen",
      deadline: null,
      deadlineAllDay: false,
      priority: null,
      parentId,
      x: 1,
      y: 4,
    });
    expect(chunk).toEqual({
      title: "Cover the happy path",
      description: "",
      time: null,
      timeAllDay: false,
      order: 0,
      parentId: expect.any(String),
    });
  });

  it("strips system-managed bit lifecycle fields from creation payloads", () => {
    const parsed = createBitSchema.parse({
      title: "Write tests",
      icon: "pen",
      parentId: crypto.randomUUID(),
      x: 1,
      y: 4,
      archivedAt: 123,
    });

    expect(parsed).not.toHaveProperty("archivedAt");
  });

  it("accepts node and bit coordinates up to the configured grid bounds", () => {
    const parentId = crypto.randomUUID();

    expect(() =>
      createNodeSchema.parse({
        title: "Inbox",
        color: "hsl(210, 80%, 55%)",
        icon: "inbox",
        parentId: null,
        level: 0,
        x: GRID_COLS - 1,
        y: GRID_ROWS - 1,
      }),
    ).not.toThrow();

    expect(() =>
      createBitSchema.parse({
        title: "Write tests",
        icon: "pen",
        parentId,
        x: GRID_COLS - 1,
        y: GRID_ROWS - 1,
      }),
    ).not.toThrow();
  });

  it("validates scratch breakdown creation payloads and defaults consumedAt", () => {
    const scratchBitId = crypto.randomUUID();

    expect(() =>
      createScratchBreakdownSchema.parse({
        scratchBitId,
        content: "",
        order: 0,
      }),
    ).toThrow();

    expect(() =>
      createScratchBreakdownSchema.parse({
        scratchBitId,
        content: "a".repeat(1001),
        order: 0,
      }),
    ).toThrow();

    expect(() =>
      createScratchBreakdownSchema.parse({
        scratchBitId,
        content: "Plan first pass",
        order: -1,
      }),
    ).toThrow();

    expect(
      createScratchBreakdownSchema.parse({
        scratchBitId,
        content: "Plan first pass",
        order: 0,
      }),
    ).toEqual({
      scratchBitId,
      content: "Plan first pass",
      order: 0,
    });

    expect(
      scratchBreakdownSchema.parse({
        id: crypto.randomUUID(),
        scratchBitId,
        content: "Plan first pass",
        order: 0,
        createdAt: Date.now(),
        version: 1,
      }).consumedAt,
    ).toBeNull();
  });

  it("requires monotonic stored versions and defaults persisted dismissal state", () => {
    const timestamp = Date.now();
    const node = {
      id: crypto.randomUUID(),
      title: "Inbox",
      color: "hsl(210, 80%, 55%)",
      icon: "inbox",
      deadline: null,
      deadlineAllDay: false,
      mtime: timestamp,
      createdAt: timestamp,
      parentId: null,
      level: 0,
      x: 0,
      y: 0,
      deletedAt: null,
    };
    const bit = {
      id: crypto.randomUUID(),
      title: "Scratch",
      description: "",
      icon: "circle",
      deadline: null,
      deadlineAllDay: false,
      priority: null,
      status: "active",
      mtime: timestamp,
      createdAt: timestamp,
      parentId: node.id,
      x: 0,
      y: 0,
      deletedAt: null,
    };
    const breakdown = {
      id: crypto.randomUUID(),
      scratchBitId: bit.id,
      content: "Plan first pass",
      order: 0,
      createdAt: timestamp,
      consumedAt: null,
    };

    expect(nodeSchema.safeParse(node).success).toBe(false);
    expect(nodeSchema.safeParse({ ...node, version: 0 }).success).toBe(false);
    expect(nodeSchema.safeParse({ ...node, version: 1.5 }).success).toBe(false);
    expect(nodeSchema.parse({ ...node, version: 1 })).toMatchObject({
      version: 1,
      pastDeadlineDismissed: false,
    });

    expect(dbSchema.bitSchema.safeParse(bit).success).toBe(false);
    expect(dbSchema.bitSchema.safeParse({ ...bit, version: 0 }).success).toBe(false);
    expect(dbSchema.bitSchema.parse({ ...bit, version: 1 })).toMatchObject({
      version: 1,
      pastDeadlineDismissed: false,
    });

    expect(scratchBreakdownSchema.safeParse(breakdown).success).toBe(false);
    expect(scratchBreakdownSchema.safeParse({ ...breakdown, version: 0 }).success).toBe(false);
    expect(scratchBreakdownSchema.parse({ ...breakdown, version: 1 })).toMatchObject({
      version: 1,
    });
  });

  it("keeps public create and update payloads free of system-managed fields", () => {
    const nodeUpdateSchema = getExportedSchema("updateNodeSchema");
    const bitUpdateSchema = getExportedSchema("updateBitSchema");
    const breakdownUpdateSchema = getExportedSchema("updateScratchBreakdownSchema");
    const immutable = {
      id: crypto.randomUUID(),
      mtime: Date.now(),
      createdAt: Date.now(),
      version: 9,
      deletedAt: Date.now(),
      archivedAt: Date.now(),
      systemRole: "inbox",
    };
    const createManaged = {
      ...immutable,
      hiddenFromGrid: true,
      pastDeadlineDismissed: true,
    };

    const nodeCreate = createNodeSchema.parse({
      title: "Inbox",
      color: "hsl(210, 80%, 55%)",
      icon: "inbox",
      parentId: null,
      level: 0,
      x: 0,
      y: 0,
      ...createManaged,
    });
    for (const field of Object.keys(createManaged)) {
      expect(nodeCreate).not.toHaveProperty(field);
    }
    const bitCreate = createBitSchema.parse({
      title: "Bit",
      icon: "circle",
      parentId: crypto.randomUUID(),
      x: 0,
      y: 0,
      status: "complete",
      ...createManaged,
    });
    for (const field of [...Object.keys(createManaged), "status"]) {
      expect(bitCreate).not.toHaveProperty(field);
    }
    const breakdownCreate = createScratchBreakdownSchema.parse({
      scratchBitId: crypto.randomUUID(),
      content: "Row",
      order: 0,
      consumedAt: Date.now(),
      ...immutable,
    });
    for (const field of [...Object.keys(immutable), "consumedAt"]) {
      expect(breakdownCreate).not.toHaveProperty(field);
    }
    expect(
      nodeUpdateSchema.parse({
        title: "Renamed",
        hiddenFromGrid: true,
        pastDeadlineDismissed: true,
        ...immutable,
      }),
    ).toEqual({
      title: "Renamed",
      hiddenFromGrid: true,
      pastDeadlineDismissed: true,
    });
    expect(
      bitUpdateSchema.parse({
        title: "Updated",
        status: "complete",
        pastDeadlineDismissed: true,
        ...immutable,
      }),
    ).toEqual({
      title: "Updated",
      status: "complete",
      pastDeadlineDismissed: true,
    });
    expect(
      breakdownUpdateSchema.parse({
        content: "Updated row",
        order: 2,
        scratchBitId: crypto.randomUUID(),
        consumedAt: Date.now(),
        ...immutable,
      }),
    ).toEqual({ content: "Updated row", order: 2 });
  });

  it("defines durable candidates without duplicated display or placement state", () => {
    const candidateSchema = getExportedSchema("stagedCandidateSchema");
    const createCandidateSchema = getExportedSchema("createStagedCandidateSchema");
    const timestamp = Date.now();
    const stored = candidateSchema.parse({
      id: crypto.randomUUID(),
      scratchBitId: crypto.randomUUID(),
      sourceBreakdownId: crypto.randomUUID(),
      resultType: "node",
      lifecycle: "staged",
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
      label: "duplicated source text",
      target: { x: 1, y: 2 },
      pendingSnapshot: { title: "draft" },
    });

    expect(stored).toEqual({
      id: expect.any(String),
      scratchBitId: expect.any(String),
      sourceBreakdownId: expect.any(String),
      resultType: "node",
      lifecycle: "staged",
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    });
    expect(
      createCandidateSchema.parse({
        ...stored,
        lifecycle: "staged",
      }),
    ).toEqual({
      scratchBitId: stored.scratchBitId,
      sourceBreakdownId: stored.sourceBreakdownId,
      resultType: "node",
    });
  });

  it("keeps orphan evidence and reload recovery narrowly scoped", () => {
    const auditSchema = getExportedSchema("candidateOrphanAuditEventSchema");
    const recoverySchema = getExportedSchema("pendingOperationRecoverySchema");
    const operationIdSchema = getExportedSchema("repositoryOperationIdSchema");
    const operationStatusSchema = getExportedSchema("repositoryOperationStatusSchema");
    const operationId = crypto.randomUUID();
    const timestamp = Date.now();

    expect(operationIdSchema.parse(operationId)).toBe(operationId);
    for (const status of [
      "applied",
      "already_applied",
      "not_applied",
      "rejected",
      "conflict",
    ]) {
      expect(operationStatusSchema.parse(status)).toBe(status);
    }
    expect(operationStatusSchema.safeParse("unknown").success).toBe(false);
    expect(
      auditSchema.parse({
        id: crypto.randomUUID(),
        cause: "source_deleted",
        candidateId: crypto.randomUUID(),
        sourceBreakdownId: crypto.randomUUID(),
        scratchBitId: crypto.randomUUID(),
        occurredAt: timestamp,
        operationStatus: "pending",
      }),
    ).not.toHaveProperty("operationStatus");

    const recovery = recoverySchema.parse({
      operationId,
      kind: "archive_scratch",
      scratchBitId: crypto.randomUUID(),
      expectedVersion: 3,
      startedAt: timestamp,
      draft: "do not persist",
      payload: { title: "do not persist" },
      queue: [operationId],
    });
    expect(recovery).toEqual({
      operationId,
      kind: "archive_scratch",
      scratchBitId: expect.any(String),
      expectedVersion: 3,
      startedAt: timestamp,
    });
  });
});

describe("boundary cases (shared with the database constraints)", () => {
  const schemas = {
    node: nodeSchema,
    bit: bitSchema,
    chunk: chunkSchema,
    scratchBreakdown: scratchBreakdownSchema,
    stagedCandidate: stagedCandidateSchema,
  };

  it("accepts every base entity", () => {
    for (const [entity, schema] of Object.entries(schemas)) {
      const base = baseEntities[entity as keyof typeof baseEntities];
      expect(schema.safeParse(base).success, entity).toBe(true);
    }
  });

  it.each(boundaryCases.map((boundary) => [`${boundary.entity}.${boundary.label}`, boundary] as const))(
    "%s",
    (_name, boundary) => {
      const row = { ...baseEntities[boundary.entity], [boundary.field]: boundary.value };
      expect(schemas[boundary.entity].safeParse(row).success).toBe(boundary.valid);
    },
  );
});
