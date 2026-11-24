import { Module } from '@nestjs/common';
import { PostModule } from 'src/modules/social';
import { LinkEmbedService } from './link-embed.service';

@Module({
  imports: [PostModule],
  providers: [LinkEmbedService],
  exports: [LinkEmbedService],
})
export class LinkEmbedModule {}
