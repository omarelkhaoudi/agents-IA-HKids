import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { TrainingCenterRepository } from '../src/repositories/TrainingCenterRepository.js';
import { TrainingCenterService } from '../src/services/training-center/TrainingCenterService.js';

async function createStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);

  const repository = new TrainingCenterRepository(pool);
  const service = new TrainingCenterService({ repository });
  await service.initialize();

  return { repository, service };
}

test('Training Center initializes with seeded course data', async () => {
  const { service } = await createStack();
  const bootstrap = await service.getWorkspaceBootstrap();

  assert.ok(Array.isArray(bootstrap.courses));
  assert.ok(bootstrap.courses.length >= 1);
  assert.deepEqual(bootstrap.courseStatuses, ['draft', 'published', 'archived']);
  assert.deepEqual(bootstrap.sessionStatuses, ['scheduled', 'completed', 'cancelled']);
});

test('Training Center can create and update a course and session', async () => {
  const { service } = await createStack();

  const course = await service.createCourse({
    title: 'Manager Onboarding',
    description: 'Training course for new managers.',
    category: 'Leadership',
    tags: ['leadership', 'management'],
    durationHours: 4,
    prerequisites: ['orientation'],
    metadata: { targetAudience: 'managers' },
  });

  assert.equal(course.title, 'Manager Onboarding');
  assert.equal(course.status, 'draft');
  assert.ok(course.id);

  const updatedCourse = await service.updateCourse(course.id, { status: 'published' });
  assert.equal(updatedCourse.status, 'published');

  const session = await service.createSession({
    courseId: course.id,
    title: 'Manager Onboarding Session 1',
    description: 'Kickoff session for manager training.',
    scheduledAt: '2026-09-01T10:00:00Z',
    durationMinutes: 180,
    instructor: 'Rania',
    location: 'Room 402',
    capacity: 16,
    metadata: { delivery: 'in-person' },
  });

  assert.equal(session.courseId, course.id);
  assert.equal(session.status, 'scheduled');
  assert.equal(session.title, 'Manager Onboarding Session 1');

  const updatedSession = await service.updateSession(session.id, { status: 'completed' });
  assert.equal(updatedSession.status, 'completed');
});
