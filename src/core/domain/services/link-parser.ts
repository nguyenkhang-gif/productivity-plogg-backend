import { EmbedProvider } from 'src/core/domain/entities/message-embed.entity';

export interface ParsedLink {
  url: string;
  provider: EmbedProvider;
  refId: string;
}

const MAX_EMBEDS = 3;
const URL_REGEX = /https?:\/\/[^\s<>"'`)\]}]+/gi;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_PATH = /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/;

const POST_PATH = /^\/(?:posts|blog)\/([A-Za-z0-9_-]+)\/?$/;

function parseYouTube(u: URL): string | null {
  if (u.host === 'youtu.be' || u.host === 'www.youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return YT_ID.test(id) ? id : null;
  }
  const v = u.searchParams.get('v');
  if (v && YT_ID.test(v)) return v;
  const m = u.pathname.match(YT_PATH);
  return m ? m[1] : null;
}

/**
 * Tách link đáng tạo embed ra khỏi nội dung tin nhắn.
 *
 * Hàm thuần — không đọc env, không I/O. `internalHosts` do caller cung cấp
 * (xem `LinkEmbedService`), để `core/` không phụ thuộc config.
 *
 * @param internalHosts host được coi là nội bộ, vd `new Set(['plog.app'])`
 */
export function extractLinks(
  content: string,
  internalHosts: Set<string>,
): ParsedLink[] {
  const hosts = internalHosts;
  const seen = new Set<string>();
  const out: ParsedLink[] = [];

  for (const raw of content.match(URL_REGEX) ?? []) {
    const cleaned = raw.replace(/[.,;:!?]+$/, ''); // bỏ dấu câu dính đuôi
    if (seen.has(cleaned)) continue;

    let u: URL;
    try {
      u = new URL(cleaned);
    } catch {
      continue;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;

    if (YOUTUBE_HOSTS.has(u.host)) {
      const videoId = parseYouTube(u);
      if (videoId) {
        seen.add(cleaned);
        out.push({ url: cleaned, provider: 'YOUTUBE', refId: videoId });
      }
    } else if (hosts.has(u.host)) {
      const m = u.pathname.match(POST_PATH);
      if (m) {
        seen.add(cleaned);
        out.push({ url: cleaned, provider: 'INTERNAL_POST', refId: m[1] });
      }
    }

    if (out.length >= MAX_EMBEDS) break;
  }

  return out;
}
