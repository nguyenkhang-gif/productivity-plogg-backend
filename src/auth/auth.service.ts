import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcryptjs from 'bcryptjs';
import * as jwt from 'jsonwebtoken'; // Dành cho môi trường hỗ trợ ES Modules
import { IUser, IResponseUser } from 'src/user/interfaces/user.interface';
@Injectable({})
export class AuthService {
  constructor(@InjectModel('User') private userModel: Model<IUser>) {}

  getHello(): string {
    return 'Hello World!';
  }

  async login(body: {
    username: string;
    password: string;
  }): Promise<{ token: string; user: IResponseUser }> {
    console.log("some one is login...");
    
    const { username, password } = body;
    const user = await this.userModel.findOne({ username });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    const isPasswordCorrect = await bcryptjs.compare(password, user.password);

    if (!isPasswordCorrect) {
      throw new Error('Invalid username or password');
    }
    const token = jwt.sign(
      {
        userId: user._id,
        userRole: user.role,
        userMemberShip: user.membership,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: '24h',
      },
    );
    return {
      token,
      user: {
        _id: user._id.toString(),
        fullName: user.fullName,
        username: user.username,
        profilePic: user.profilePic,
        membership: user.membership,
        role: user.role,
      },
    };
  }

  async signup(body: {
    fullName: string;
    username: string;
    password: string;
    confirmPassword: string;
    gender: string;
  }): Promise<{ token: string; user: IResponseUser }> {
    const { fullName, username, password, confirmPassword, gender } = body;

    if (password !== confirmPassword) {
      throw new Error("Passwords don't match");
    }

    const existingUser = await this.userModel.findOne({ username });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const salt = await bcryptjs.genSalt(10);
    const hashPassword = await bcryptjs.hash(password, salt);

    const boyUrl = 'https://avatar.iran.liara.run/public/boy';
    const girlUrl = 'https://avatar.iran.liara.run/public/girl';

    const newUser = new this.userModel({
      fullName,
      username,
      password: hashPassword,
      gender,
      profilePic: gender === 'male' ? boyUrl : girlUrl,
    });

    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: '1h',
      },
    );

    return {
      token,
      user: {
        _id: newUser._id.toString(),
        fullName: newUser.fullName,
        username: newUser.username,
        profilePic: newUser.profilePic,
        membership: newUser.membership ?? 'basic',
        role: newUser.role ?? 'customer',
      },
    };
  }
}
