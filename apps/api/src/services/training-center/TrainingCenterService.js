export class TrainingCenterService {
  constructor({ repository }) {
    this.repository = repository;
  }

  async initialize() {
    const courses = await this.repository.listCourses();
    if (!courses.length) {
      await this.repository.createCourse({
        title: 'H-Kids Enterprise Training Overview',
        description: 'Core onboarding and training materials for enterprise operations.',
        category: 'Training',
        status: 'published',
        tags: ['training', 'enterprise', 'onboarding'],
        durationHours: 2,
        prerequisites: ['employee_orientation'],
        metadata: { source: 'seed' },
      });
    }
  }

  async getWorkspaceBootstrap() {
    const [courses, sessions] = await Promise.all([
      this.repository.listCourses({ status: 'published' }),
      this.repository.listSessions({ status: 'scheduled' }),
    ]);

    return {
      courses,
      sessions,
      courseStatuses: ['draft', 'published', 'archived'],
      sessionStatuses: ['scheduled', 'completed', 'cancelled'],
    };
  }

  async listCourses(filters = {}) {
    return this.repository.listCourses(filters);
  }

  async getCourse(id) {
    return this.repository.getCourse(id);
  }

  async createCourse(payload) {
    return this.repository.createCourse(payload);
  }

  async updateCourse(id, payload) {
    return this.repository.updateCourse(id, payload);
  }

  async listSessions(filters = {}) {
    return this.repository.listSessions(filters);
  }

  async getSession(id) {
    return this.repository.getSession(id);
  }

  async createSession(payload) {
    return this.repository.createSession(payload);
  }

  async updateSession(id, payload) {
    return this.repository.updateSession(id, payload);
  }
}
