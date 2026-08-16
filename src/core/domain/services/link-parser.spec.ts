import { extractLinks } from './link-parser';

describe('extractLinks', () => {
  const HOSTS = new Set(['plog.app', 'localhost:3000']);

  describe('không có link', () => {
    it('trả mảng rỗng khi content không chứa URL', () => {
      expect(extractLinks('hello world', HOSTS)).toEqual([]);
    });

    it('trả mảng rỗng khi content rỗng', () => {
      expect(extractLinks('', HOSTS)).toEqual([]);
    });
  });

  describe('YouTube', () => {
    it.each([
      ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
      ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
      ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
      ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
      ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
      ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ])('bắt được %s', (url, videoId) => {
      expect(extractLinks(url, HOSTS)).toEqual([
        { url, provider: 'YOUTUBE', refId: videoId },
      ]);
    });

    it('bỏ qua query param thừa (?t=, ?si=)', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ?si=abc123&t=42';
      expect(extractLinks(url, HOSTS)[0].refId).toBe('dQw4w9WgXcQ');
    });

    it('bỏ qua link YouTube không có video id', () => {
      expect(extractLinks('https://www.youtube.com/feed/subscriptions', HOSTS)).toEqual(
        [],
      );
    });

    it('bỏ qua video id sai độ dài', () => {
      expect(extractLinks('https://youtu.be/tooshort', HOSTS)).toEqual([]);
    });
  });

  describe('post nội bộ', () => {
    it('bắt được /posts/:id', () => {
      const url = 'https://plog.app/posts/507f1f77bcf86cd799439011';
      expect(extractLinks(url, HOSTS)).toEqual([
        {
          url,
          provider: 'INTERNAL_POST',
          refId: '507f1f77bcf86cd799439011',
        },
      ]);
    });

    it('bắt được /blog/:id', () => {
      const url = 'https://plog.app/blog/507f1f77bcf86cd799439011';
      expect(extractLinks(url, HOSTS)[0].provider).toBe('INTERNAL_POST');
    });

    it('chấp nhận dấu / ở cuối', () => {
      const url = 'https://plog.app/posts/abc123/';
      expect(extractLinks(url, HOSTS)[0].refId).toBe('abc123');
    });

    it('bỏ qua đường dẫn khác trên cùng domain', () => {
      expect(extractLinks('https://plog.app/settings/profile', HOSTS)).toEqual([]);
    });

    it('bỏ qua domain lạ dù đúng path', () => {
      expect(extractLinks('https://evil.com/posts/abc123', HOSTS)).toEqual([]);
    });

    it('nhận localhost:3000 khi dev', () => {
      const url = 'http://localhost:3000/posts/abc123';
      expect(extractLinks(url, HOSTS)[0].provider).toBe('INTERNAL_POST');
    });
  });

  describe('quy tắc chung', () => {
    it('bỏ dấu câu dính đuôi URL', () => {
      const out = extractLinks('xem bài này https://plog.app/posts/abc123.', HOSTS);
      expect(out[0].url).toBe('https://plog.app/posts/abc123');
    });

    it('khử trùng lặp cùng một URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(extractLinks(`${url} và lại ${url}`, HOSTS)).toHaveLength(1);
    });

    it('giới hạn tối đa 3 embed', () => {
      const content = [
        'https://youtu.be/aaaaaaaaaaa',
        'https://youtu.be/bbbbbbbbbbb',
        'https://youtu.be/ccccccccccc',
        'https://youtu.be/ddddddddddd',
      ].join(' ');
      expect(extractLinks(content, HOSTS)).toHaveLength(3);
    });

    it('bỏ qua protocol không phải http/https', () => {
      expect(extractLinks('ftp://plog.app/posts/abc123', HOSTS)).toEqual([]);
    });

    it('giữ đúng thứ tự xuất hiện', () => {
      const out = extractLinks(
        'https://plog.app/posts/abc123 rồi https://youtu.be/dQw4w9WgXcQ',
        HOSTS,
      );
      expect(out.map((e) => e.provider)).toEqual([
        'INTERNAL_POST',
        'YOUTUBE',
      ]);
    });
  });
});
