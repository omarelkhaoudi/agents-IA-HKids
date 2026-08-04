import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { trainingCenterService } from '../runtime/training-center-runtime.js';
import {
  idParamsSchema,
  trainingCourseBodySchema,
  trainingSessionBodySchema,
} from '../validation/schemas.js';

const trainingCenterRouter = Router();

trainingCenterRouter.get('/training/bootstrap', async (_request, response) => {
  response.json(await trainingCenterService.getWorkspaceBootstrap());
});

trainingCenterRouter.get('/training/courses', async (request, response) => {
  response.json({
    items: await trainingCenterService.listCourses({
      status: request.query.status,
      category: request.query.category,
      search: request.query.search,
    }),
  });
});

trainingCenterRouter.get('/training/courses/:id', validate({ params: idParamsSchema }), async (request, response) => {
  const course = await trainingCenterService.getCourse(request.params.id);
  if (!course) {
    response.status(404).json({ message: 'Course not found.' });
    return;
  }
  response.json(course);
});

trainingCenterRouter.post(
  '/training/courses',
  validate({ body: trainingCourseBodySchema }),
  async (request, response) => {
    response.status(201).json(await trainingCenterService.createCourse(request.body));
  }
);

trainingCenterRouter.put(
  '/training/courses/:id',
  validate({ params: idParamsSchema, body: trainingCourseBodySchema.partial() }),
  async (request, response) => {
    try {
      response.json(await trainingCenterService.updateCourse(request.params.id, request.body));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to update course.',
      });
    }
  }
);

trainingCenterRouter.get('/training/courses/:id/sessions', validate({ params: idParamsSchema }), async (request, response) => {
  response.json({
    items: await trainingCenterService.listSessions({ courseId: request.params.id }),
  });
});

trainingCenterRouter.get('/training/sessions', async (request, response) => {
  response.json({
    items: await trainingCenterService.listSessions({
      status: request.query.status,
      courseId: request.query.courseId,
      search: request.query.search,
    }),
  });
});

trainingCenterRouter.get('/training/sessions/:id', validate({ params: idParamsSchema }), async (request, response) => {
  const session = await trainingCenterService.getSession(request.params.id);
  if (!session) {
    response.status(404).json({ message: 'Session not found.' });
    return;
  }
  response.json(session);
});

trainingCenterRouter.post(
  '/training/sessions',
  validate({ body: trainingSessionBodySchema }),
  async (request, response) => {
    response.status(201).json(await trainingCenterService.createSession(request.body));
  }
);

trainingCenterRouter.put(
  '/training/sessions/:id',
  validate({ params: idParamsSchema, body: trainingSessionBodySchema.partial() }),
  async (request, response) => {
    try {
      response.json(await trainingCenterService.updateSession(request.params.id, request.body));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to update session.',
      });
    }
  }
);

export default trainingCenterRouter;
