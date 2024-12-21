import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/users/schema/user.schema';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
interface IUser {
  _id: string;
  fullName: string;
  username: string;
  profilePic: string;
  memberShip: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async login(
    body: LoginDto,
  ): Promise<{ access_token: string; refresh_token: string; user: IUser }> {
    const user = await this.userModel.findOne({ username: body.username });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(body.password, user.password);

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const access_token = jwt.sign(
      {
        userId: user._id,
        userRole: user.role,
        userMembership: user.membership,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: '1h', // Access token hết hạn sau 15 phút
      },
    );

    // Tạo refresh token
    const refresh_token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: '7d', // Refresh token hết hạn sau 7 ngày
      },
    );
    return {
      access_token,
      refresh_token,
      user: {
        _id: user._id.toString(),
        fullName: user.fullName,
        username: user.username,
        profilePic: user.profilePic,
        memberShip: user.membership,
        role: user.role,
      },
    };
  }
  async refreshToken(refreshToken: string) {
    try {
      const decode = jwt.verify(refreshToken, process.env.JWT_SECRET_KEY);
      const { userId } = decode as { userId: string };

      const user = await this.userModel.findById(userId);

      if (!user) throw new UnauthorizedException('User not found');
      const newAccessToken = jwt.sign(
        {
          userId: user._id,
          userRole: user.role,
          userMembership: user.membership,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '1h' },
      );

      const refresh_token = jwt.sign(
        {
          userId: user._id,
        },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: '7d', // Refresh token hết hạn sau 7 ngày
        },
      );
      return {
        access_token: newAccessToken,
        refresh_token,
      };
    } catch (e) {
      console.error('horror', e);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
