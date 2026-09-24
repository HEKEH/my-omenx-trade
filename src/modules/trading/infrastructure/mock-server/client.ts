import type {
  AccrueFundingResult,
  PostgrestError,
  ProcessBinaryTradeArgs,
  ProcessBinaryTradeResult,
  QueryResult,
  TableName,
} from "../supabase-shape/rows";
import type { MockDatabase } from "./db";
import { accrueFundingFunction } from "./functions";
import { QueryBuilder, type Latency } from "./query";
import { MockRealtime, type MockChannel } from "./realtime";
import { processBinaryTrade } from "./rpc";

interface RpcSignatures {
  process_binary_trade: { args: ProcessBinaryTradeArgs; result: ProcessBinaryTradeResult | null };
}

interface FunctionSignatures {
  "accrue-funding": { body: { positionId?: string }; result: AccrueFundingResult };
}

const toError = (error: unknown): PostgrestError => ({
  message: error instanceof Error ? error.message : String(error),
});

/**
 * A client with the same call shape as the supabase-js calls the trade page
 * makes: `from()` queries, `rpc()`, `functions.invoke()` and realtime
 * `channel()`s. Only the pieces the page uses are implemented.
 */
export interface MockSupabaseClient {
  from<K extends TableName>(table: K): QueryBuilder<K>;
  rpc<N extends keyof RpcSignatures>(name: N, args: RpcSignatures[N]["args"]): Promise<QueryResult<RpcSignatures[N]["result"]>>;
  functions: {
    invoke<N extends keyof FunctionSignatures>(
      name: N,
      options?: { body?: FunctionSignatures[N]["body"] },
    ): Promise<QueryResult<FunctionSignatures[N]["result"]>>;
  };
  channel(topic: string): MockChannel;
  removeChannel(channel: MockChannel): void;
}

export const createMockClient = (db: MockDatabase, latency: Latency): MockSupabaseClient => {
  const realtime = new MockRealtime(db);
  const call = async <T>(run: () => T): Promise<QueryResult<T>> => {
    await latency.wait();
    try {
      return { data: run(), error: null };
    } catch (error) {
      return { data: null, error: toError(error) };
    }
  };

  return {
    from: (table) => new QueryBuilder(db, table, latency),
    rpc: (name, args) => {
      if (name !== "process_binary_trade") return call(() => {
        throw new Error(`Unknown RPC: ${String(name)}`);
      });
      return call(() => processBinaryTrade(db, args));
    },
    functions: {
      invoke: (name, options) => {
        if (name !== "accrue-funding") return call(() => {
          throw new Error(`Unknown function: ${String(name)}`);
        });
        return call(() => accrueFundingFunction(db, options?.body));
      },
    },
    channel: (topic) => realtime.channel(topic),
    removeChannel: (channel) => realtime.removeChannel(channel),
  };
};
