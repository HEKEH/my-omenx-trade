import type { RealtimeEvent, TableName, Tables } from "../supabase-shape/rows";
import { buildSeed, type SeedTables } from "./seed";

export interface RowChange<K extends TableName = TableName> {
  table: K;
  eventType: RealtimeEvent;
  new: Tables[K] | null;
  old: Tables[K] | null;
  at: string;
}

type ChangeListener = (change: RowChange) => void;

type Row = Tables[TableName];

/** Primary key of each table. */
const KEYS: { [K in TableName]: keyof Tables[K] } = {
  events: "id",
  event_options: "id",
  profiles: "id",
  positions: "id",
  trades: "id",
  position_funding_ledger: "id",
  binary_order_reservations: "trade_id",
};

const clone = <T>(value: T): T => structuredClone(value);

/**
 * In-memory tables for the mock backend. Rows are copied on the way in and
 * out so callers can never mutate stored state by accident. Every write is
 * broadcast to change listeners, which is what drives the realtime channels.
 */
export class MockDatabase {
  private tables: SeedTables;
  private readonly listeners = new Set<ChangeListener>();

  constructor(seed: SeedTables = buildSeed()) {
    this.tables = clone(seed);
  }

  reset(seed: SeedTables) {
    this.tables = clone(seed);
  }

  rows<K extends TableName>(table: K): Tables[K][] {
    return clone(this.tables[table] as Tables[K][]);
  }

  find<K extends TableName>(table: K, predicate: (row: Tables[K]) => boolean): Tables[K] | undefined {
    const row = (this.tables[table] as Tables[K][]).find(predicate);
    return row ? clone(row) : undefined;
  }

  insert<K extends TableName>(table: K, row: Tables[K]): Tables[K] {
    const stored = clone(row);
    (this.tables[table] as Tables[K][]).push(stored);
    this.emit({ table, eventType: "INSERT", new: clone(stored), old: null });
    return clone(stored);
  }

  /** Merges `patch` into every matching row; returns the updated rows. */
  update<K extends TableName>(
    table: K,
    predicate: (row: Tables[K]) => boolean,
    patch: Partial<Tables[K]>,
  ): Tables[K][] {
    const updated: Tables[K][] = [];
    const rows = this.tables[table] as Tables[K][];
    rows.forEach((row, index) => {
      if (!predicate(row)) return;
      const next = { ...row, ...clone(patch) };
      rows[index] = next;
      updated.push(clone(next));
      this.emit({ table, eventType: "UPDATE", new: clone(next), old: clone(row) });
    });
    return updated;
  }

  remove<K extends TableName>(table: K, predicate: (row: Tables[K]) => boolean): Tables[K][] {
    const rows = this.tables[table] as Tables[K][];
    const removed = rows.filter(predicate);
    this.tables[table] = rows.filter((row) => !predicate(row)) as SeedTables[K];
    removed.forEach((row) => this.emit({ table, eventType: "DELETE", new: null, old: clone(row) }));
    return clone(removed);
  }

  keyOf<K extends TableName>(table: K, row: Tables[K]) {
    return row[KEYS[table]] as unknown as string;
  }

  subscribe(listener: ChangeListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(change: Omit<RowChange, "at">) {
    const full = { ...change, at: new Date().toISOString() } as RowChange;
    this.listeners.forEach((listener) => listener(full));
  }
}

export type { Row };
