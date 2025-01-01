import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RefreshToken, RefreshTokenDocument } from './refresh-token.schema';
import { Model } from 'mongoose';
import * as jwt from 'jsonwebtoken';
@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async createRefreshToken(
    userId: string,
    token: string,
    expireIn: number,
    isRevoked: boolean = false,
  ) {
    const expireAt = new Date();
    expireAt.setSeconds(expireAt.getSeconds() + expireIn);

    const exitingToken = await this.refreshTokenModel.findOne({ userId });

    if (exitingToken) {
      exitingToken.token = token;
      exitingToken.expireAt = expireAt;
      exitingToken.isRevoked = false;
      return exitingToken.save();
    }

    const refreshToken = new this.refreshTokenModel({
      userId,
      token,
      expireAt,
      isRevoked,
    });

    return refreshToken.save();
  }

  async checkRevoked(token: string) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const { userId } = decoded as { userId: string };
    const refreshToken = await this.refreshTokenModel.findOne({ userId });
    return refreshToken.isRevoked;
  }

  async revokeRefreshToken(token: string) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const { userId } = decoded as { userId: string };
    const refreshToken = await this.refreshTokenModel.findOne({ userId });
    refreshToken.isRevoked = true;
    return refreshToken.save();
  }
}
