import type { PostgrestError, QueryResult, TableName, Tables } from "../supabase-shape/rows";
import type { MockDatabase } from "./db";

type Filter<T> = (row: T) => boolean;

export interface Latency {
  /** Resolves after a simulated network round trip. */
  wait(): Promise<void>;
}

export const noLatency: Latency = { wait: () => Promise.resolve() };

/** 50–150 ms, like a nearby backend. */
export const networkLatency: Latency = {
  wait: () => new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100)),
};

const toError = (error: unknown): PostgrestError => ({
  message: error instanceof Error ? error.message : String(error),
  code: (error as { code?: string } | null)?.code,
});

type Mode = { kind: "select" } | { kind: "insert"; rows: unknown[] } | { kind: "update"; patch: unknown };

/**
 * The subset of the supabase-js query builder the trade page uses:
 * `select / insert / update`, the `eq / neq / in` filters, `order`, `limit`,
 * `single / maybeSingle`. Awaiting it yields `{ data, error }`.
 */
export class QueryBuilder<K extends TableName, R = Tables[K][]> implements PromiseLike<QueryResult<R>> {
  private mode: Mode = { kind: "select" };
  private readonly filters: Filter<Tables[K]>[] = [];
  private sort: { column: keyof Tables[K]; ascending: boolean }[] = [];
  private max: number | null = null;
  private cardinality: "many" | "single" | "maybeSingle" = "many";
  private returning = false;

  constructor(
    private readonly db: MockDatabase,
    private readonly table: K,
    private readonly latency: Latency,
  ) {}

  /** Column lists are accepted for API parity; full rows are always returned. */
  select(columns = "*"): QueryBuilder<K, R> {
    void columns;
    if (this.mode.kind === "select") return this;
    this.returning = true;
    return this;
  }

  insert(rows: Tables[K] | Tables[K][]): QueryBuilder<K, R> {
    this.mode = { kind: "insert", rows: Array.isArray(rows) ? rows : [rows] };
    return this;
  }

  update(patch: Partial<Tables[K]>): QueryBuilder<K, R> {
    this.mode = { kind: "update", patch };
    return this;
  }

  eq<C extends keyof Tables[K]>(column: C, value: Tables[K][C]) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq<C extends keyof Tables[K]>(column: C, value: Tables[K][C]) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  in<C extends keyof Tables[K]>(column: C, values: readonly Tables[K][C][]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(column: keyof Tables[K], options: { ascending?: boolean } = {}) {
    this.sort.push({ column, ascending: options.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.max = count;
    return this;
  }

  single(): QueryBuilder<K, Tables[K]> {
    this.cardinality = "single";
    return this as unknown as QueryBuilder<K, Tables[K]>;
  }

  maybeSingle(): QueryBuilder<K, Tables[K] | null> {
    this.cardinality = "maybeSingle";
    return this as unknown as QueryBuilder<K, Tables[K] | null>;
  }

  then<A = QueryResult<R>, B = never>(
    onFulfilled?: ((value: QueryResult<R>) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.execute().then(onFulfilled, onRejected);
  }

  private matches = (row: Tables[K]) => this.filters.every((filter) => filter(row));

  private async execute(): Promise<QueryResult<R>> {
    await this.latency.wait();
    try {
      const rows = this.run();
      return this.shape(rows);
    } catch (error) {
      return { data: null, error: toError(error) };
    }
  }

  private run(): Tables[K][] {
    const { mode } = this;
    if (mode.kind === "insert") {
      const inserted = (mode.rows as Tables[K][]).map((row) => this.db.insert(this.table, row));
      return this.returning ? inserted : [];
    }
    if (mode.kind === "update") {
      const updated = this.db.update(this.table, this.matches, mode.patch as Partial<Tables[K]>);
      return this.returning ? updated : [];
    }
    let rows = this.db.rows(this.table).filter(this.matches);
    for (const { column, ascending } of [...this.sort].reverse()) {
      rows = [...rows].sort((a, b) => compare(a[column], b[column]) * (ascending ? 1 : -1));
    }
    return this.max === null ? rows : rows.slice(0, this.max);
  }

  private shape(rows: Tables[K][]): QueryResult<R> {
    if (this.cardinality === "many") return { data: rows as R, error: null };
    if (rows.length > 1) {
      return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
    }
    if (rows.length === 0) {
      return this.cardinality === "maybeSingle"
        ? { data: null as R, error: null }
        : { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
    }
    return { data: rows[0] as R, error: null };
  }
}

const compare = (a: unknown, b: unknown) => {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return (a as number | string) < (b as number | string) ? -1 : 1;
};
