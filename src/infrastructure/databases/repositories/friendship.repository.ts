import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FriendshipRepository,
} from 'src/core/domain/repositories/friendship.repository.interface';
import {
  Friendship as FriendshipEntity,
  FriendshipStatus,
} from 'src/core/domain/entities/friendship.entity';
import { Friendship, FriendshipDocument } from '../schemas/friendship.schema';

const USER_LOOKUP = [
  { $project: { fullName: 1, username: 1, profilePic: 1 } },
];

@Injectable()
export class MongoFriendshipRepository implements FriendshipRepository {
  constructor(
    @InjectModel(Friendship.name)
    private readonly model: Model<FriendshipDocument>,
  ) {}

  private mapToDomain(doc: any): FriendshipEntity {
    return new FriendshipEntity({
      id: doc._id.toString(),
      userId: doc.userId,
      friendId: doc.friendId,
      status: doc.status as FriendshipStatus,
      friendInfo: doc._friendInfo
        ? {
            id: doc._friendInfo._id.toString(),
            fullName: doc._friendInfo.fullName,
            username: doc._friendInfo.username,
            profilePic: doc._friendInfo.profilePic,
          }
        : undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findById(id: string): Promise<FriendshipEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByPair(userId: string, friendId: string): Promise<FriendshipEntity | null> {
    const doc = await this.model
      .findOne({
        $or: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      })
      .exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  // friendInfo = người kia (không phải currentUser)
  async findFriends(userId: string): Promise<FriendshipEntity[]> {
    return this.model.aggregate([
      { $match: { $or: [{ userId }, { friendId: userId }], status: 'accepted' } },
      { $addFields: { _otherUserId: { $cond: [{ $eq: ['$userId', userId] }, '$friendId', '$userId'] } } },
      { $addFields: { _otherObjId: { $toObjectId: '$_otherUserId' } } },
      { $lookup: { from: 'users', localField: '_otherObjId', foreignField: '_id', pipeline: USER_LOOKUP, as: '_friendArr' } },
      { $addFields: { _friendInfo: { $arrayElemAt: ['$_friendArr', 0] } } },
    ]).then((docs) => docs.map((d) => this.mapToDomain(d)));
  }

  // friendInfo = người gửi (userId)
  async findPendingReceived(userId: string): Promise<FriendshipEntity[]> {
    return this.model.aggregate([
      { $match: { friendId: userId, status: 'pending' } },
      { $addFields: { _senderObjId: { $toObjectId: '$userId' } } },
      { $lookup: { from: 'users', localField: '_senderObjId', foreignField: '_id', pipeline: USER_LOOKUP, as: '_friendArr' } },
      { $addFields: { _friendInfo: { $arrayElemAt: ['$_friendArr', 0] } } },
    ]).then((docs) => docs.map((d) => this.mapToDomain(d)));
  }

  // friendInfo = người nhận (friendId)
  async findPendingSent(userId: string): Promise<FriendshipEntity[]> {
    return this.model.aggregate([
      { $match: { userId, status: 'pending' } },
      { $addFields: { _receiverObjId: { $toObjectId: '$friendId' } } },
      { $lookup: { from: 'users', localField: '_receiverObjId', foreignField: '_id', pipeline: USER_LOOKUP, as: '_friendArr' } },
      { $addFields: { _friendInfo: { $arrayElemAt: ['$_friendArr', 0] } } },
    ]).then((docs) => docs.map((d) => this.mapToDomain(d)));
  }

  async create(friendship: FriendshipEntity): Promise<FriendshipEntity> {
    const created = new this.model({
      userId: friendship.userId,
      friendId: friendship.friendId,
      status: friendship.status,
    });
    const saved = await created.save();
    return this.mapToDomain(saved);
  }

  async updateStatus(id: string, status: FriendshipStatus): Promise<FriendshipEntity> {
    const updated = await this.model
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!updated) throw new Error('Friendship not found');
    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}
