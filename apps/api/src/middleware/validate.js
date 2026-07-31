import { z } from 'zod';

function formatZodError(error) {
  if (!(error instanceof z.ZodError)) {
    return 'Validation failed.';
  }

  const firstIssue = error.issues[0];
  const field = firstIssue.path.length > 0 ? `${firstIssue.path.join('.')}: ` : '';
  return `${field}${firstIssue.message}`;
}

// Express 5 exposes `params` and `query` through getters, so the parsed values
// have to be redefined on the request instead of assigned.
function replaceRequestProperty(request, property, value) {
  Object.defineProperty(request, property, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

export function validate(schemas) {
  return (request, response, next) => {
    try {
      if (schemas.params) {
        replaceRequestProperty(request, 'params', schemas.params.parse(request.params));
      }

      if (schemas.query) {
        replaceRequestProperty(request, 'query', schemas.query.parse(request.query));
      }

      if (schemas.body) {
        request.body = schemas.body.parse(request.body ?? {});
      }

      next();
    } catch (error) {
      response.status(400).json({
        message: formatZodError(error),
        errors:
          error instanceof z.ZodError
            ? error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
              }))
            : [],
      });
    }
  };
}
