// apps/api/src/modules/applications/applications.controller.ts
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { applicationsService } from './applications.service';
import { ApplicationStatus } from '@hbms/shared';
import { BadRequestError } from '../../common/errors';

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

  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageBase64, filename } = req.body;
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        throw new BadRequestError('Image data (base64 string) is required');
      }

      // Check if it's already an external HTTP(S) URL or relative upload path
      if (
        imageBase64.startsWith('http://') ||
        imageBase64.startsWith('https://') ||
        imageBase64.startsWith('/uploads/')
      ) {
        return res.status(200).json({
          success: true,
          data: {
            url: imageBase64,
            filename: imageBase64.split('/').pop() || 'cover.jpg',
          },
        });
      }

      // Determine extension and clean base64 data
      let ext = 'jpg';
      let rawBase64 = imageBase64;
      const match = imageBase64.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const mimeSubtype = match[1].toLowerCase();
        if (mimeSubtype.includes('png')) ext = 'png';
        else if (mimeSubtype.includes('webp')) ext = 'webp';
        else if (mimeSubtype.includes('gif')) ext = 'gif';
        else if (mimeSubtype.includes('avif')) ext = 'avif';
        else if (mimeSubtype.includes('jpeg') || mimeSubtype.includes('jpg')) ext = 'jpg';
        rawBase64 = match[2];
      }

      const buffer = Buffer.from(rawBase64, 'base64');
      if (buffer.length > 10 * 1024 * 1024) {
        throw new BadRequestError('Image file size exceeds maximum 10MB limit');
      }

      const safeRandom = Math.random().toString(36).substring(2, 9);
      const safePrefix = (filename || 'hotel-thumbnail')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .substring(0, 30);
      const uniqueFilename = `${safePrefix || 'hotel'}-${Date.now()}-${safeRandom}.${ext}`;

      // Resolve target directory pointing to apps/web/public/uploads/hotels
      let targetDir = path.resolve(process.cwd(), 'apps/web/public/uploads/hotels');
      if (fs.existsSync(path.resolve(process.cwd(), '../web/public'))) {
        targetDir = path.resolve(process.cwd(), '../web/public/uploads/hotels');
      } else if (!fs.existsSync(path.resolve(process.cwd(), 'apps/web/public'))) {
        targetDir = path.resolve(__dirname, '../../../../web/public/uploads/hotels');
      }

      fs.mkdirSync(targetDir, { recursive: true });
      const targetFilePath = path.join(targetDir, uniqueFilename);
      fs.writeFileSync(targetFilePath, buffer);

      const relativeUrl = `/uploads/hotels/${uniqueFilename}`;

      res.status(200).json({
        success: true,
        data: {
          url: relativeUrl,
          filename: uniqueFilename,
          sizeBytes: buffer.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const applicationsController = new ApplicationsController();

