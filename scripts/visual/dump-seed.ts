// Prints the replica's mock seed as JSON, for ref-backend.cjs to serve to the reference.
import { buildSeed } from "../../src/modules/trading/infrastructure/mock-server/seed";

process.stdout.write(JSON.stringify(buildSeed()));
