import { Module } from '@nestjs/common';
import { PostModule } from 'src/infrastructure/post/post.module';
import { LinkEmbedService } from './link-embed.service';

@Module({
  imports: [PostModule],
  providers: [LinkEmbedService],
  exports: [LinkEmbedService],
})
export class LinkEmbedModule {}
