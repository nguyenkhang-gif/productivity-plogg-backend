import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/users/schema/user.schema';
import { LoginDto, SignUpDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { RefreshTokenService } from '../refreshToken/refresh-token.service';
import { MailService } from 'src/mail/mail.service';
import {
  RefreshToken,
  RefreshTokenDocument,
} from 'src/refreshToken/refresh-token.schema';
import { TokenFactory } from 'src/utils/token.factory';
interface IUser {
  _id: string;
  fullName: string;
  username: string;
  gender: string;
  profilePic: string;
  memberShip: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly mailService: MailService,
  ) {}
  async signUpWithToken(token: string) {
    const decodedForm = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const form = decodedForm as {
      fullName: string;
      username: string;
      password: string;
      gender: string;
      profilePic: string;
      memberShip: string;
      email: string;
      role: string;
    };
    const findUser = await this.userModel.findOne({ email: form.email });
    if (findUser) {
      throw new Error('User already exists');
    }

    const newUser = new this.userModel(form);

    const user = await newUser.save();
    const access_token = TokenFactory.createAccessToken({
      userId: user._id,
      userRole: user.role,
      userMembership: user.membership,
    });
    const refresh_token = TokenFactory.createRefreshToken({
      userId: user._id,
    });
    this.refreshTokenService.createRefreshToken(
      user._id.toString(),
      refresh_token,
      7 * 24 * 60 * 60,
    );
    if (user._id) {
      return {
        access_token,
        refresh_token,
        user: {
          fullName: user.fullName,
          gender: user.gender,
          username: user.username,
          profilePic: user.profilePic,
          email: user.email,
          memberShip: user.membership,
          role: user.role,
        },
      };
    }
  }
  async signUp(body: SignUpDto) {
    const existingUser = await this.userModel.findOne({
      username: body.username,
    });
    if (existingUser) {
      throw new UnauthorizedException('Username already exists');
    }

    // Kiểm tra email
    const existingEmail = await this.userModel.findOne({ email: body.email });
    if (existingEmail) {
      throw new UnauthorizedException('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const jwtAuthToken = TokenFactory.createRefreshToken({
      fullName: body.fullName,
      gender: body.gender,
      username: body.username,
      password: body.noHashPassword ? body.password : hashedPassword,
      email: body.email,
    });
    const url = `${process.env.CLIENT_ORIGIN}/auth?jwt=${jwtAuthToken}`;
    const htmlContent = `
      <div>
        <h1>Welcome!</h1>
        <p>Please verify your email by clicking the link below: </p>
        <a href="${url}" target="_blank" style="color: blue; text-decoration: underline;">Verify Email</a>
      </div>
    `;

    await this.mailService.sendMail(
      body.email,
      'verify your email',
      htmlContent,
    );

    return jwtAuthToken;
  }

  async login(
    body: LoginDto,
  ): Promise<{ access_token: string; refresh_token: string; user: IUser }> {
    const user = await this.userModel.findOne({ username: body.username });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(body.password, user.password);

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const access_token = TokenFactory.createAccessToken({
      userId: user._id,
      userRole: user.role,
      userMembership: user.membership,
    });

    // Tạo refresh token
    const refresh_token = TokenFactory.createRefreshToken({
      userId: user._id,
    });

    const userId = user._id.toString();
    this.refreshTokenService.createRefreshToken(
      userId,
      refresh_token,
      7 * 24 * 60 * 60,
    );

    return {
      access_token,
      refresh_token,
      user: {
        _id: user._id.toString(),
        fullName: user.fullName,
        gender: user.gender,
        username: user.username,
        profilePic: user.profilePic,
        email: user.email,
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

  async logout(token: string) {
    try {
      const refreshToken =
        await this.refreshTokenService.revokeRefreshToken(token);
      if (!refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      refreshToken.isRevoked = true;
      await refreshToken.save();
      return { message: 'Logout successful' };
    } catch (error) {
      console.error('logout', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async profile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return {
      fullName: user.fullName,
      gender: user.gender,
      username: user.username,
      profilePic: user.profilePic,
      email: user.email,
      memberShip: user.membership,
      role: user.role,
    };
  }
}
