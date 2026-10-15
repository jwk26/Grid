// GridDO Inbox/Triage test data for browser checks.
//
// Run only in the Chrome DevTools MCP browser against a local dev server.
// Install: evaluate_script with `() => { <this file> }`.
// Then: `() => window.griddoFixture.seed({ theme: "retro-mac" })`, and reload
// the page so the app reads the new data. Open the returned `inboxRoute`.
//
// seed() clears the GridDO database only when every record is fixture data,
// a record the app created under fixture data during a check, or a system
// Node the app creates on first load. Anything else stops it.
window.griddoFixture = (() => {
  const DB_NAME = "GridDO";
  const FIXTURE_PREFIX = "fd000000-0000-4000-8000-";
  const REQUIRED_STORES = ["nodes", "bits", "scratchBreakdowns", "stagedCandidates"];
  const KEY_VALUE_STORES = ["settings"];
  // The field that names a record's owner in each id-keyed store.
  const OWNER_FIELD = {
    nodes: "parentId",
    bits: "parentId",
    chunks: "parentId",
    scratchBreakdowns: "scratchBitId",
    stagedCandidates: "scratchBitId",
    candidateOrphanAuditEvents: "scratchBitId",
  };
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const fid = (n) => FIXTURE_PREFIX + String(n).padStart(12, "0");
  const sized = (label, length) => label.padEnd(length, "x");

  // Scenario ids, so checks can name records without reading the database.
  const IDS = {
    inbox: fid(1),
    archive: fid(2),
    systemFolder: fid(10),
    documents: fid(12),
    fullFolder: fid(14),
    depth2Target: fid(23),
    stagingScratch: fid(100),
    longBreakdownScratch: fid(101),
    titleLimitScratch: fid(102),
    archiveEligibleScratch: fid(103),
    activeRowScratch: fid(104),
    emptyScratch: fid(105),
    longTitleScratch: fid(106),
    stagedOnlyScratch: fid(107),
  };

  function build({ now = Date.now(), overflow = false } = {}) {
    const nodes = [];
    const bits = [];
    const scratchBreakdowns = [];
    const stagedCandidates = [];
    const node = (n, title, extra = {}) => {
      nodes.push({
        id: fid(n), title, color: "hsl(210, 50%, 50%)", icon: "Folder",
        deadline: null, deadlineAllDay: false, mtime: now, createdAt: now, version: 1,
        parentId: null, level: 0, x: 0, y: 0, deletedAt: null, archivedAt: null,
        systemRole: null, hiddenFromGrid: false, pastDeadlineDismissed: false, ...extra,
      });
    };
    const bit = (n, title, parent, extra = {}) => {
      bits.push({
        id: fid(n), title, description: "", icon: "FileText", deadline: null,
        deadlineAllDay: false, priority: null, status: "active", mtime: now, createdAt: now,
        version: 1, parentId: fid(parent), x: 0, y: 0, deletedAt: null, archivedAt: null,
        pastDeadlineDismissed: false, ...extra,
      });
    };
    const row = (n, scratch, content, order, consumed = false) => {
      const owner = bits.find((b) => b.id === fid(scratch));
      const createdAt = Math.min(now - 1, owner.createdAt + (order + 1) * MINUTE);
      scratchBreakdowns.push({
        id: fid(n), scratchBitId: owner.id, content, order, createdAt,
        consumedAt: consumed ? Math.max(createdAt + 1, now - HOUR) : null, version: 1,
      });
    };
    const stage = (n, source, resultType) => {
      const sourceRow = scratchBreakdowns.find((r) => r.id === fid(source));
      stagedCandidates.push({
        id: fid(n), scratchBitId: sourceRow.scratchBitId, sourceBreakdownId: sourceRow.id,
        resultType, lifecycle: "staged", createdAt: now - 30 * MINUTE + n, updatedAt: now - 30 * MINUTE + n, version: 1,
      });
    };

    // L0: system Nodes as the app seeds them, then the Explorer hierarchy.
    node(1, "Inbox", { systemRole: "inbox", icon: "inbox", color: "hsl(221, 83%, 53%)" });
    node(2, "Archive", { systemRole: "archive_view", icon: "layers", color: "hsl(240, 4%, 46%)", x: 1 });
    node(10, "System Folder", { icon: "Settings", x: 2 });
    node(11, "Applications", { icon: "Layers", x: 3 });
    node(12, "Documents", { x: 4 });
    node(13, "Bit only folder", { x: 5 });
    node(14, "Full folder", { icon: "Box", x: 6 });
    node(20, "Extensions", { parentId: fid(10), level: 1 });
    node(21, "Control Panels", { parentId: fid(10), level: 1, x: 1 });
    node(22, "MacPaint", { parentId: fid(11), level: 1, icon: "Palette" });
    node(23, "Sound", { parentId: fid(21), level: 2 });
    node(24, "Monitors", { parentId: fid(21), level: 2, x: 1 });

    // Bits for Finder cards: duplicates, metadata, completion and a 200-character title.
    bit(300, "Finder 7.0", 10, { x: 2 });
    bit(301, "HyperCard 2.1", 11, { x: 1 });
    bit(302, "Quarterly report", 12);
    bit(303, "Review note", 12, { x: 1 });
    bit(304, "Review note", 12, { x: 2 });
    bit(305, "High priority with deadline", 12, { x: 3, priority: "high", deadline: now + DAY });
    bit(306, "Overdue Bit", 12, { x: 4, deadline: now - DAY });
    bit(307, "Completed Bit", 12, { x: 5, status: "complete", mtime: now - 10 * DAY });
    bit(308, "Completed overdue Bit", 12, { x: 6, status: "complete", deadline: now - DAY });
    bit(309, sized("Long Bit title at the 200-character limit ", 200), 12, { x: 7, priority: "mid" });
    bit(310, "Bit only note", 13);
    bit(311, "Volume settings", 23);
    for (let i = 0; i < 18 * 9; i += 1) {
      bit(1000 + i, `Occupied ${i % 18},${Math.floor(i / 18)}`, 14, { x: i % 18, y: Math.floor(i / 18) });
    }
    if (overflow) {
      for (let i = 0; i < 40; i += 1) node(600 + i, `Column anchor ${i}`, { x: i % 18, y: 1 + Math.floor(i / 18) });
    }

    // Inbox Scratches. Ages cover the relative-date labels and the absolute date.
    const scratch = (n, title, age, x) =>
      bit(n, title, 1, { icon: "Lightbulb", x, createdAt: now - age, mtime: now - age });
    scratch(100, "Plan the field study", 45 * MINUTE, 0);
    scratch(101, "Collect workshop feedback", 26 * HOUR, 1);
    scratch(102, "Placement title limits", 52 * HOUR, 2);
    scratch(103, "Ready to archive", 6 * DAY, 3);
    scratch(104, "Waiting on one row", 10 * DAY, 4);
    scratch(105, "Empty scratch", 30 * DAY, 5);
    scratch(106, sized("Long Scratch title at the 200-character limit ", 200), 2 * HOUR, 6);
    scratch(107, "Staged only", 14 * DAY, 7);

    // Staging: open rows with one Node and one Bit candidate.
    ["Review the field notes", "Draft the study summary", "Book the meeting room",
      "Send the participant list", "Archive the old drafts"].forEach((text, i) => row(200 + i, 100, text, i));
    stage(250, 200, "node");
    stage(251, 201, "bit");
    // Breakdown: 20 rows for scrolling, the first two consumed.
    for (let i = 0; i < 20; i += 1) row(210 + i, 101, `Workshop feedback item ${i + 1}`, i, i < 2);
    // Placement: result-title limits are 100 (Node) and 200 (Bit) characters.
    row(230, 102, "Implement pixel-perfect window dragging", 0);
    row(231, 102, sized("Row at the Node title limit, 100 characters ", 100), 1);
    row(232, 102, sized("Row one over the Node title limit, 101 characters ", 101), 2);
    row(233, 102, sized("Row at the Bit title limit, 200 characters ", 200), 3);
    row(234, 102, sized("Row one over the Bit title limit, 201 characters ", 201), 4);
    row(235, 102, sized("Row at the 1000-character content limit ", 1000), 5);
    row(236, 102, "System setup", 6);
    row(237, 102, "Configure AppleTalk", 7);
    stage(252, 236, "node");
    stage(253, 237, "bit");
    stage(254, 232, "node");
    stage(255, 234, "bit");
    // Completion and Archive: eligible, an open row, empty, and staged-only.
    ["Confirm the venue", "Send the invitations", "Print the agenda"].forEach((text, i) => row(240 + i, 103, text, i, true));
    row(243, 104, "Collect the receipts", 0, true);
    row(244, 104, "File the expense report", 1);
    row(245, 107, "Order the supplies", 0, true);
    row(246, 107, "Pick up the badges", 1);
    stage(256, 246, "bit");

    // Mark every fixture grid as already past the one-time breadcrumb-zone
    // relocation, as in a real database, so opening a grid keeps these cells.
    const settings = [null, ...nodes.map((n) => n.id)].map((parentId) => ({
      key: `bzMigration_${parentId ?? "__root__"}`,
      value: true,
    }));

    return { nodes, bits, scratchBreakdowns, stagedCandidates, settings };
  }

  function checkGuard(rowsByStore) {
    const ownerOf = new Map();
    for (const [store, rows] of Object.entries(rowsByStore)) {
      const field = OWNER_FIELD[store];
      if (!field) continue;
      for (const row of rows) ownerOf.set(row.id, row[field] ?? null);
    }
    const owned = new Map();
    const isFixtureOwned = (id) => {
      if (typeof id !== "string") return false;
      if (id.startsWith(FIXTURE_PREFIX)) return true;
      if (owned.has(id)) return owned.get(id);
      owned.set(id, false); // breaks ownership cycles
      const result = isFixtureOwned(ownerOf.get(id));
      owned.set(id, result);
      return result;
    };
    const blocked = {};
    for (const [store, rows] of Object.entries(rowsByStore)) {
      if (KEY_VALUE_STORES.includes(store)) continue;
      for (const row of rows) {
        if (isFixtureOwned(row?.id)) continue;
        const appSystemNode = store === "nodes" && row.systemRole != null && row.parentId == null;
        if (appSystemNode) continue;
        (blocked[store] ??= []).push(String(row?.id));
      }
    }
    const summary = Object.fromEntries(
      Object.entries(blocked).map(([store, ids]) => [store, { count: ids.length, sample: ids.slice(0, 3) }]),
    );
    return { ok: Object.keys(summary).length === 0, blocked: summary };
  }

  function assertLocal() {
    if (!["localhost", "127.0.0.1"].includes(location.hostname)) {
      throw new Error(`Fixture runs only on a local dev server, not ${location.hostname}`);
    }
  }

  async function openExisting() {
    const names = (await indexedDB.databases()).map((d) => d.name);
    if (!names.includes(DB_NAME)) {
      throw new Error(`${DB_NAME} does not exist yet. Open the app once, then seed.`);
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME); // no version: read the current schema
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Reads every store and, if `decide` returns writes, applies them in the same transaction.
  function readThenWrite(db, stores, mode, decide) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      const rowsByStore = {};
      let pending = stores.length;
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Fixture transaction aborted"));
      for (const store of stores) {
        const request = tx.objectStore(store).getAll();
        request.onsuccess = () => {
          rowsByStore[store] = request.result;
          pending -= 1;
          if (pending > 0) return;
          const { value, writes } = decide(rowsByStore);
          result = value;
          for (const [name, rows] of Object.entries(writes ?? {})) {
            const target = tx.objectStore(name);
            target.clear();
            for (const row of rows) target.put(row);
          }
        };
      }
    });
  }

  function countRows(rowsByStore) {
    return Object.fromEntries(Object.entries(rowsByStore).map(([store, rows]) => [store, rows.length]));
  }

  async function inspect() {
    assertLocal();
    const db = await openExisting();
    try {
      const stores = [...db.objectStoreNames];
      return await readThenWrite(db, stores, "readonly", (rows) => ({
        value: { databaseVersion: db.version, stores, counts: countRows(rows), guard: checkGuard(rows) },
      }));
    } finally {
      db.close();
    }
  }

  async function seed(options = {}) {
    assertLocal();
    const db = await openExisting();
    try {
      const stores = [...db.objectStoreNames];
      const missing = REQUIRED_STORES.filter((store) => !stores.includes(store));
      if (missing.length > 0) {
        throw new Error(`Schema mismatch at version ${db.version}: missing ${missing.join(", ")}`);
      }
      const data = build(options);
      const verdict = await readThenWrite(db, stores, "readwrite", (rows) => {
        const guard = checkGuard(rows);
        if (!guard.ok) return { value: guard };
        const writes = Object.fromEntries(stores.map((store) => [store, data[store] ?? []]));
        return { value: guard, writes };
      });
      if (!verdict.ok) {
        throw new Error(`Refusing to clear ${DB_NAME}; it holds non-fixture records: ${JSON.stringify(verdict.blocked)}`);
      }
      applyPresentation(options);
      return {
        databaseVersion: db.version,
        counts: countRows(data),
        inboxRoute: `/grid/${IDS.inbox}`,
        ids: IDS,
        next: "Reload the page; the app does not observe direct IndexedDB writes.",
      };
    } finally {
      db.close();
    }
  }

  // Optional device presentation, using the keys the app persists.
  function applyPresentation({ theme, mode, poolSort, breakdownSort }) {
    if (theme) localStorage.setItem("griddo-color-theme", theme);
    if (mode) localStorage.setItem("theme", mode);
    if (poolSort || breakdownSort) {
      const current = JSON.parse(localStorage.getItem("griddo-triage-preferences") ?? "{}");
      localStorage.setItem("griddo-triage-preferences", JSON.stringify({
        poolCreatedAtSort: poolSort ?? current.poolCreatedAtSort ?? "DESC",
        breakdownCreatedAtSort: breakdownSort ?? current.breakdownCreatedAtSort ?? "DESC",
      }));
    }
  }

  // Fault injection: hold the transaction that touches `store`/`key` with `op`,
  // then abort it or let it commit. Patches last until disarm() or a reload.
  const faultState = { originals: null, armed: [], events: [], nextId: 1 };
  const FAULT_OPS = ["put", "add", "delete", "get"];

  function keyMatches(requestKey, key) {
    if (requestKey instanceof IDBKeyRange) return requestKey.includes(key);
    try {
      return indexedDB.cmp(requestKey, key) === 0;
    } catch {
      return false;
    }
  }

  function hold(store, fault) {
    const tx = store.transaction;
    const event = {
      fault: fault.id, store: store.name, op: fault.op, key: fault.key, mode: tx.mode,
      outcome: fault.outcome, startedAt: performance.now(), endedAt: null,
    };
    faultState.events.push(event);
    const deadline = performance.now() + fault.holdMs;
    const pump = () => {
      if (performance.now() >= deadline) {
        event.endedAt = performance.now();
        if (fault.outcome === "abort") {
          try {
            tx.abort();
          } catch (error) {
            event.error = String(error);
          }
        }
        return;
      }
      // A pending request keeps the transaction open.
      const keepAlive = faultState.originals.get.call(store, fault.key);
      keepAlive.onsuccess = pump;
      keepAlive.onerror = () => {
        event.error = String(keepAlive.error);
      };
    };
    pump();
  }

  function installPatches() {
    if (faultState.originals) return;
    const proto = IDBObjectStore.prototype;
    faultState.originals = Object.fromEntries(FAULT_OPS.map((op) => [op, proto[op]]));
    for (const op of FAULT_OPS) {
      proto[op] = function patched(...args) {
        const request = faultState.originals[op].apply(this, args);
        if (this.transaction.db.name !== DB_NAME) return request;
        const requestKey = op === "put" || op === "add"
          ? args[1] ?? (typeof this.keyPath === "string" ? args[0]?.[this.keyPath] : undefined)
          : args[0];
        const fault = faultState.armed.find((f) =>
          f.remaining > 0 && f.op === op && f.store === this.name && keyMatches(requestKey, f.key));
        if (fault) {
          fault.remaining -= 1;
          hold(this, fault);
        }
        return request;
      };
    }
  }

  function armFault({ store, key, op = "put", holdMs = 0, outcome = "abort", times = 1 }) {
    if (typeof store !== "string" || key === undefined) throw new Error("armFault needs store and key");
    if (!FAULT_OPS.includes(op)) throw new Error(`op must be one of ${FAULT_OPS.join(", ")}`);
    if (!["abort", "commit"].includes(outcome)) throw new Error("outcome must be abort or commit");
    installPatches();
    const fault = { id: faultState.nextId++, store, key, op, holdMs, outcome, remaining: times };
    faultState.armed.push(fault);
    return { ...fault };
  }

  function faults() {
    return {
      armed: faultState.armed.map((f) => ({ ...f })),
      events: faultState.events.map((e) => ({ ...e })),
    };
  }

  function disarm() {
    if (faultState.originals) Object.assign(IDBObjectStore.prototype, faultState.originals);
    faultState.originals = null;
    faultState.armed = [];
  }

  return { FIXTURE_PREFIX, IDS, build, checkGuard, inspect, seed, armFault, faults, disarm };
})();
