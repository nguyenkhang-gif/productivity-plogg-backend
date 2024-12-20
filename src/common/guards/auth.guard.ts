import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from 'src/user/interfaces/user.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector, // Nếu cần lấy metadata
    @InjectModel('User') private readonly userModel: Model<IUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized - No Token Provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY) as {
        userId: string;
      };

      // Tìm người dùng bằng userId từ token
      const user = await this.userModel
        .findById(decoded.userId)
        .select('-password');
      if (!user) {
        console.log('no user');

        throw new UnauthorizedException('User not found');
      }

      // Lưu thông tin người dùng vào request
      request.user = user;

      return true; // Cho phép truy cập
    } catch (err) {
      throw new UnauthorizedException('Unauthorized - Invalid Token');
    }
  }
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector, // Nếu cần lấy metadata
    @InjectModel('User') private readonly userModel: Model<IUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized - No Token Provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY) as {
        userId: string;
      };

      // Tìm người dùng bằng userId từ token
      const user = await this.userModel
        .findById(decoded.userId)
        .select('-password');
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (user.role !== 'admin') {
        throw new UnauthorizedException('Unauthorized - Invalid Token');
      }
      // Lưu thông tin người dùng vào request
      request.user = user;

      return true; // Cho phép truy cập
    } catch (err) {
      throw new UnauthorizedException('Unauthorized - Invalid Token');
    }
  }
}
