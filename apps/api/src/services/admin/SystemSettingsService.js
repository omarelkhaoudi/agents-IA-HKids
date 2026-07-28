export class SystemSettingsService {
  constructor(systemSettingsRepository) {
    this.systemSettingsRepository = systemSettingsRepository;
  }

  async initialize(defaults = {}) {
    await this.systemSettingsRepository.ensureDefaults(defaults);
  }

  getSettings() {
    return this.systemSettingsRepository.getAll();
  }

  getDetailedSettings() {
    return this.systemSettingsRepository.getDetailed();
  }

  updateSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings payload must be an object.');
    }

    return this.systemSettingsRepository.upsertMany(settings);
  }
}
