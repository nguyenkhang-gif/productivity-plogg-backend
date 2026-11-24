import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import {
  User,
  UserDocument,
} from 'src/modules/identity/user/infrastructure/user.schema';
import { PrismaService } from 'src/shared/database/prisma.service';
import { resolveBackend } from 'src/shared/database/backend-provider';

const THROTTLE_MS = 60_000;

function verifyJwtPayload(token: string): any {
  const secret = process.env.JWT_SECRET_KEY?.trim();
  if (!secret) return null;
  try {
    return verify(token, secret);
  } catch {
    return null;
  }
}

@Injectable()
export class LastSeenMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async readLastSeen(userId: string): Promise<Date | null> {
    if (resolveBackend(this.config) === 'postgres') {
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { lastSeen: true },
      });
      return row?.lastSeen ?? null;
    }
    const doc = await this.userModel.findById(userId, { lastSeen: 1 }).lean();
    return (doc as any)?.lastSeen ?? null;
  }

  private async writeLastSeen(userId: string, at: Date): Promise<void> {
    if (resolveBackend(this.config) === 'postgres') {
      await this.prisma.user.updateMany({
        where: { id: userId },
        data: { lastSeen: at },
      });
      return;
    }
    await this.userModel.findByIdAndUpdate(userId, { lastSeen: at });
  }

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const payload = verifyJwtPayload(token);
        const userId = payload?.userId || payload?.sub;
        if (typeof userId === 'string' && userId) {
          const lastSeen = await this.readLastSeen(userId);
          const now = Date.now();
          if (!lastSeen || now - new Date(lastSeen).getTime() > THROTTLE_MS) {
            await this.writeLastSeen(userId, new Date(now));
          }
        }
      }
    } catch {
      // never block request
    }
    next();
  }
}
