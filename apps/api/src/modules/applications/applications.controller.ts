// apps/api/src/modules/applications/applications.controller.ts
import { Request, Response, NextFunction } from 'express';
import { applicationsService } from './applications.service';
import { ApplicationStatus } from '@hbms/shared';

export class ApplicationsController {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await applicationsService.submitApplication(req.user!.userId, req.body, req.ip);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await applicationsService.getMyApplication(req.user!.userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as ApplicationStatus | undefined;
      const result = await applicationsService.listApplications(status);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await applicationsService.getApplicationById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async review(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await applicationsService.reviewApplication(
        req.params.id,
        req.user!.userId,
        req.body,
        req.ip
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const applicationsController = new ApplicationsController();

