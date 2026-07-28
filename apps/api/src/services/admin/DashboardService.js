export class DashboardService {
  constructor(adminStatsRepository) {
    this.adminStatsRepository = adminStatsRepository;
  }

  async getDashboard() {
    const [counts, aiStats] = await Promise.all([
      this.adminStatsRepository.getPlatformCounts(),
      this.adminStatsRepository.getAiStatistics(),
    ]);

    return {
      ...counts,
      ...aiStats,
    };
  }

  async getStatistics() {
    return this.getDashboard();
  }
}
