import { IsMongoId, IsNotEmpty } from 'class-validator';

export class FriendTargetDto {
  @IsMongoId()
  @IsNotEmpty()
  friendId: string;
}
