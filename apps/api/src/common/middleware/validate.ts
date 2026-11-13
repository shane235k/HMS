// apps/api/src/common/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { BadRequestError } from '../errors';

export const validate = (schema: ZodTypeAny, source: 'body' | 'query' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (source === 'query') {
        const parsed = await schema.parseAsync(req.query);
        req.query = parsed;
      } else {
        req.body = await schema.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(new BadRequestError('Validation failed', details));
      }
      next(error);
    }
  };
};
