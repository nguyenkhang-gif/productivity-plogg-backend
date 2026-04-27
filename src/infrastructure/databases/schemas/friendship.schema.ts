import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FriendshipDocument = Friendship & Document;

@Schema({ timestamps: true })
export class Friendship {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  friendId: string;

  @Prop({
    required: true,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending',
  })
  status: string;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);

// Prevent duplicate pairs and enable fast lookups
FriendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });
FriendshipSchema.index({ friendId: 1, status: 1 });
