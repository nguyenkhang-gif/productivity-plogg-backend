import { Inject, Injectable, Logger } from '@nestjs/common';
import { Message } from 'src/core/domain/entities/message.entity';
import { PostEmbedCard } from 'src/core/domain/entities/message-embed.entity';
import { extractLinks, ParsedLink } from 'src/core/domain/services/link-parser';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';

@Injectable()
export class LinkEmbedService {
  private readonly logger = new Logger(LinkEmbedService.name);
  private readonly internalHosts: Set<string>;

  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {
    this.internalHosts = LinkEmbedService.resolveInternalHosts();
  }

  /** Host được coi là "nội bộ". Đọc env một lần lúc khởi tạo. */
  private static resolveInternalHosts(): Set<string> {
    const hosts = (process.env.CLIENT_ORIGIN ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((o) => {
        try {
          return new URL(o).host;
        } catch {
          return '';
        }
      })
      .filter(Boolean);
    hosts.push('localhost:3000'); // dev
    return new Set(hosts);
  }

  /** Nhận diện link trong content. Chỉ parse chuỗi — không DB, không mạng. */
  extract(content: string): ParsedLink[] {
    return extractLinks(content, this.internalHosts);
  }

  /**
   * Populate tại chỗ (mutate). Dùng chung cho cả luồng gửi lẫn luồng đọc.
   * viewerId quyết định thấy gì — cùng message, mỗi người thấy khác nhau.
   */
  async populate(messages: Message[], viewerId: string): Promise<void> {
    const embeds = messages.flatMap((m) => m.embeds ?? []);
    if (embeds.length === 0) return; // đa số trang chat không có link → thoát sớm

    const postIds = [
      ...new Set(
        embeds
          .filter((e) => e.provider === 'INTERNAL_POST' && e.refId)
          .map((e) => e.refId as string),
      ),
    ];
    if (postIds.length === 0) return;

    let cards: PostEmbedCard[] = [];
    try {
      // 1 query Mongo cho CẢ trang — không N+1
      cards = await this.postRepo.findManyForEmbed(postIds, viewerId);
    } catch (err) {
      // Mongo lỗi thì chat vẫn phải chạy, chỉ mất card
      this.logger.warn(`populate embeds failed: ${String(err)}`);
    }

    const byId = new Map(cards.map((c) => [c.id, c]));
    for (const e of embeds) {
      if (e.provider !== 'INTERNAL_POST') continue;
      // null = đã xoá HOẶC không có quyền — cố ý không phân biệt
      e.resolved = (e.refId && byId.get(e.refId)) || null;
    }
  }
}
