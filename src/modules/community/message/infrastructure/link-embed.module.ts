import { Module } from '@nestjs/common';
import { FriendshipModule, PostModule } from 'src/modules/social';
import { LinkEmbedService } from './link-embed.service';

@Module({
  imports: [PostModule, FriendshipModule],
  providers: [LinkEmbedService],
  exports: [LinkEmbedService],
})
export class LinkEmbedModule {}
