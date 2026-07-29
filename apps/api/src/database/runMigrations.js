import { access } from 'node:fs/promises';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resolveMigrationsDirectory() {
  const candidates = [
    path.join(__dirname, 'migrations'),
    path.join(__dirname, 'database', 'migrations'),
    path.join(__dirname, '..', 'src', 'database', 'migrations'),
    path.join(process.cwd(), 'src', 'database', 'migrations'),
    path.join(process.cwd(), 'apps', 'api', 'src', 'database', 'migrations'),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }

  return path.join(__dirname, 'migrations');
}

export async function runMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDirectory = await resolveMigrationsDirectory();
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const alreadyApplied = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1',
      [migrationFile]
    );

    if (alreadyApplied.rowCount > 0) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDirectory, migrationFile), 'utf-8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migrationFile]);
  }
}
