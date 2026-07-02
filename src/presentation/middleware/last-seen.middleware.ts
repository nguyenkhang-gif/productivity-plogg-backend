import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import {
  User,
  UserDocument,
} from 'src/infrastructure/databases/schemas/user.schema';

const THROTTLE_MS = 60_000;

function decodeJwtPayload(token: string): any {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(Buffer.from(base64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

@Injectable()
export class LastSeenMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const payload = decodeJwtPayload(token);
        const userId = payload?.userId || payload?.sub;
        if (userId) {
          const doc = await this.userModel
            .findById(userId, { lastSeen: 1 })
            .lean();
          const lastSeen = (doc as any)?.lastSeen;
          const now = Date.now();
          if (!lastSeen || now - new Date(lastSeen).getTime() > THROTTLE_MS) {
            await this.userModel.findByIdAndUpdate(userId, {
              lastSeen: new Date(now),
            });
          }
        }
      }
    } catch {
      // never block request
    }
    next();
  }
}
