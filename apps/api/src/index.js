import { persistenceService } from './runtime/assistant-runtime.js';
import { initializeAdminRuntime } from './runtime/admin-runtime.js';
import { workflowEngine } from './runtime/workflow-runtime.js';
import { startServer } from './server.js';

await persistenceService.initialize();
await workflowEngine.initialize();
await initializeAdminRuntime();
startServer();
