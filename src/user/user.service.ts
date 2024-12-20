import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateResult } from 'mongodb';
import { IUser } from './interfaces/user.interface'; // Import schema của bạn

@Injectable()
export class UserService {
  constructor(@InjectModel('User') private userModel: Model<IUser>) {}

  getHello(): string {
    return 'Hello World!';
  }

  // Phương thức để lấy tất cả người dùng
  async getAllUsers(): Promise<IUser[]> {
    return this.userModel.find().exec();
  }

  async updateObject(data: any): Promise<UpdateResult | null> {
    const { _id, $set } = data.data;
    console.log(data, _id, 'data');

    if (!_id) {
      throw new BadRequestException('ID must be provided for update');
    }

    const updateData = {
      $set: { ...$set },
    };

    const result = await this.userModel
      .updateOne({ _id }, updateData, { new: true })
      .exec();

    if (result.matchedCount === 0) {
      throw new BadRequestException('No document found with the provided ID');
    }

    return result;
  }
}
