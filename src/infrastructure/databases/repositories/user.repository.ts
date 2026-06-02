import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserRepository } from 'src/core/domain/repositories/user.repository.interface';
import { User, UserDocument } from '../schemas/user.schema';
import { Model } from 'mongoose';
import { User as UserEntity } from 'src/core/domain/entities/user.entity';

@Injectable()
export class MongoUserRepository implements UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private mapToDomain(userDoc: UserDocument): UserEntity {
    return new UserEntity({
      id: userDoc._id.toString(),
      fullName: userDoc.fullName,
      username: userDoc.username,
      email: userDoc.email,
      passwordHash: userDoc.passwordHash,
      gender: userDoc.gender,
      profilePic: userDoc.profilePic,
      membership: userDoc.membership,
      role: userDoc.role,
      isPrivate: userDoc.isPrivate,
      resetPasswordToken: userDoc.resetPasswordToken,
      googleId: (userDoc as any).googleId,
      facebookId: (userDoc as any).facebookId,
      createdAt: (userDoc as any).createdAt,
      updatedAt: (userDoc as any).updatedAt,
    });
  }

  async findById(id: string): Promise<UserEntity | null> {
    const userDoc = await this.userModel.findById(id).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const userDoc = await this.userModel.findOne({ email }).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const userDoc = await this.userModel.findOne({ username }).exec();
    if (!userDoc) return null;
    return this.mapToDomain(userDoc);
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    const userDoc = await this.userModel.findOne({ googleId }).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  async findByFacebookId(facebookId: string): Promise<UserEntity | null> {
    const userDoc = await this.userModel.findOne({ facebookId }).exec();
    return userDoc ? this.mapToDomain(userDoc) : null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const createdUser = new this.userModel({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      gender: user.gender,
      profilePic: user.profilePic,
      googleId: user.googleId,
      facebookId: user.facebookId,
    });
    const savedUser = await createdUser.save();
    return this.mapToDomain(savedUser);
  }

  async search(query: string, excludeUserId: string): Promise<UserEntity[]> {
    const regex = new RegExp(query, 'i');
    const docs = await this.userModel
      .find({
        _id: { $ne: excludeUserId },
        $or: [{ username: regex }, { fullName: regex }],
      })
      .select('fullName username profilePic')
      .limit(20)
      .exec();
    return docs.map((doc) => this.mapToDomain(doc));
  }

  async update(id: string, userUpdate: Partial<UserEntity>): Promise<UserEntity> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, userUpdate, { new: true })
      .exec();
    if (!updatedUser) throw new Error('User not found');
    return this.mapToDomain(updatedUser);
  }
}
