import { spawn } from 'node:child_process';

const root = process.cwd();
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const npxCommand = isWindows ? 'npx.cmd' : 'npx';

const e2eEnv = {
  ...process.env,
  PORT: '3002',
  CLIENT_URL: 'http://127.0.0.1:5174',
  VITE_API_BASE_URL: 'http://127.0.0.1:3002',
  HKIDS_USE_IN_MEMORY_DB: 'true',
};

function start(command, args) {
  const spawnCommand = isWindows ? process.env.ComSpec || 'cmd.exe' : command;
  const spawnArgs = isWindows ? ['/d', '/s', '/c', command, ...args] : args;

  return spawn(spawnCommand, spawnArgs, {
    cwd: root,
    env: e2eEnv,
    stdio: 'inherit',
    detached: !isWindows,
  });
}

async function waitForUrl(url, timeoutMs = 120_000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function killTree(child) {
  if (!child.pid || child.killed) {
    return;
  }

  if (isWindows) {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
      killer.once('exit', resolve);
      killer.once('error', resolve);
    });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // Already stopped.
    }
  }
}

const api = start(npmCommand, ['run', 'dev', '-w', '@hkids/api']);
const web = start(npmCommand, [
  'run',
  'dev',
  '-w',
  '@hkids/web',
  '--',
  '--host',
  '127.0.0.1',
  '--port',
  '5174',
  '--strictPort',
]);

let exitCode = 1;

try {
  await Promise.all([
    waitForUrl('http://127.0.0.1:3002/api/health'),
    waitForUrl('http://127.0.0.1:5174'),
  ]);

  const playwright = start(npxCommand, ['playwright', 'test', '--config', 'playwright.config.ts']);
  const result = await waitForExit(playwright);
  exitCode = result.code ?? (result.signal ? 1 : 0);
} finally {
  await Promise.all([killTree(web), killTree(api)]);
}

process.exit(exitCode);
