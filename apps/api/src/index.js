import { initializeAuthRuntime } from './runtime/auth-runtime.js';
import { initializeContentRuntime } from './runtime/content-runtime.js';
import { initializeAdminRuntime } from './runtime/admin-runtime.js';
import { workflowEngine } from './runtime/workflow-runtime.js';
import { startServer } from './server.js';

await initializeAuthRuntime();
await initializeContentRuntime();
await workflowEngine.initialize();
await initializeAdminRuntime();
startServer();
