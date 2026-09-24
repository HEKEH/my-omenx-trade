import type { PostgresChangesPayload, RealtimeEvent, TableName, Tables } from "../supabase-shape/rows";
import type { MockDatabase, RowChange } from "./db";

export interface PostgresChangesFilter {
  event: RealtimeEvent | "*";
  schema: "public";
  table: TableName;
  /** PostgREST-style filter, only `column=eq.value` is supported. */
  filter?: string;
}

type Handler = (payload: PostgresChangesPayload<Tables[TableName]>) => void;

export type ChannelStatus = "SUBSCRIBED" | "CLOSED";

const parseFilter = (filter?: string) => {
  if (!filter) return null;
  const match = /^(\w+)=eq\.(.+)$/.exec(filter);
  if (!match) throw new Error(`Unsupported realtime filter: ${filter}`);
  return { column: match[1], value: match[2] };
};

const matchesFilter = (change: RowChange, spec: PostgresChangesFilter) => {
  if (change.table !== spec.table) return false;
  if (spec.event !== "*" && spec.event !== change.eventType) return false;
  const filter = parseFilter(spec.filter);
  if (!filter) return true;
  const row = (change.new ?? change.old) as Record<string, unknown> | null;
  return row !== null && String(row[filter.column]) === filter.value;
};

const toPayload = (change: RowChange): PostgresChangesPayload<Tables[TableName]> => ({
  schema: "public",
  table: change.table,
  commit_timestamp: change.at,
  eventType: change.eventType,
  new: change.new ?? {},
  old: change.old ?? {},
  errors: null,
});

/** A Supabase Realtime channel carrying `postgres_changes` for the mock tables. */
export class MockChannel {
  private readonly bindings: { spec: PostgresChangesFilter; handler: Handler }[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(
    readonly topic: string,
    private readonly db: MockDatabase,
  ) {}

  on<K extends TableName>(
    type: "postgres_changes",
    spec: PostgresChangesFilter & { table: K },
    handler: (payload: PostgresChangesPayload<Tables[K]>) => void,
  ) {
    void type;
    this.bindings.push({ spec, handler: handler as Handler });
    return this;
  }

  subscribe(callback?: (status: ChannelStatus) => void) {
    if (!this.unsubscribe) {
      this.unsubscribe = this.db.subscribe((change) => {
        for (const { spec, handler } of this.bindings) {
          if (matchesFilter(change, spec)) handler(toPayload(change));
        }
      });
    }
    callback?.("SUBSCRIBED");
    return this;
  }

  close() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}

export class MockRealtime {
  private readonly channels = new Set<MockChannel>();

  constructor(private readonly db: MockDatabase) {}

  channel(topic: string) {
    const channel = new MockChannel(topic, this.db);
    this.channels.add(channel);
    return channel;
  }

  removeChannel(channel: MockChannel) {
    channel.close();
    this.channels.delete(channel);
  }

  removeAllChannels() {
    this.channels.forEach((channel) => channel.close());
    this.channels.clear();
  }
}
