import { createTypeScriptEngine } from '@cube/solver-ts';
import type { FromWorker, ToWorker } from '@cube/solver-contracts';
import { startWorkerHost } from './worker-host';
// Only mathematical tables live in memory. No photos, camera IDs or cube states are persisted.
const engine = createTypeScriptEngine();
const handle = startWorkerHost(engine, (message: FromWorker) => postMessage(message));
onmessage = (event: MessageEvent<ToWorker>) => handle(event.data);
