// apps/api/src/common/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle known Prisma errors
  const prismaCode = (err as any).code;
  if (prismaCode === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'A resource with this identifier already exists',
        details: (err as any).meta,
      },
    });
  }

  if (prismaCode === 'P2034') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Concurrency conflict: Database transaction write conflict. Please retry.',
        details: (err as any).meta,
      },
    });
  }

  if (prismaCode === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Record not found',
        details: (err as any).meta,
      },
    });
  }

  console.error('Unhandled Application Error:', err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred' : err.message,
    },
  });
};
