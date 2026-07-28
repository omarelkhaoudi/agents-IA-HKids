const defaultSettings = {
  default_provider: 'anthropic',
  default_model: 'claude-3-5-sonnet-latest',
  enable_streaming: 'false',
  max_retries: '2',
  request_timeout_ms: '30000',
  default_language: 'English',
  company_name: 'H-Kids',
  company_address: '14 Avenue des Orangers, Casablanca, Morocco',
  company_phone: '+212 5 22 00 00 00',
  company_email: 'contact@h-kids.ma',
  company_logo: '',
  legal_information: 'H-Kids SARL',
  vat_number: 'VAT-HKIDS-001',
  currency: 'MAD',
};

export class SystemSettingsRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async ensureDefaults(overrides = {}) {
    const values = { ...defaultSettings, ...overrides };

    for (const [key, value] of Object.entries(values)) {
      await this.pool.query(
        `
          INSERT INTO system_settings (key, value)
          VALUES ($1, $2)
          ON CONFLICT (key) DO NOTHING
        `,
        [key, String(value)]
      );
    }
  }

  async getAll() {
    const result = await this.pool.query('SELECT key, value, updated_at FROM system_settings ORDER BY key ASC');
    return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
  }

  async getDetailed() {
    const result = await this.pool.query('SELECT key, value, updated_at FROM system_settings ORDER BY key ASC');
    return result.rows;
  }

  async upsertMany(settings) {
    for (const [key, value] of Object.entries(settings)) {
      await this.pool.query(
        `
          INSERT INTO system_settings (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
        [key, String(value)]
      );
    }

    return this.getAll();
  }
}
