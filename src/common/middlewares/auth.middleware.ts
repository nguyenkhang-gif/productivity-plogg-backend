import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from 'src/user/interfaces/user.interface';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(@InjectModel('User') private userModel: Model<IUser>) {}

  async use(req: Request, res: Response, next: NextFunction) {
    console.log('User found');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized - No Token Provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY) as {
        userId: string;
      };

      // Tìm người dùng bằng cách sử dụng userId từ token
      const user = await this.userModel
        .findById(decoded.userId)
        .select('-password');
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Lưu thông tin người dùng vào req.user
      req.user = user;

      next();
    } catch (err) {
      throw new UnauthorizedException('Unauthorized - Invalid Token');
    }
  }
}
