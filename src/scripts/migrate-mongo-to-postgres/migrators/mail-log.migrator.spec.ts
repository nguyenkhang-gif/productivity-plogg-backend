import { ObjectId } from 'bson';
import { mailLogMigrator, transformMailLog } from './mail-log.migrator';

describe('transformMailLog', () => {
  const _id = new ObjectId('64b7f0c2a1b2c3d4e5f60718');

  it('maps a complete document', () => {
    const sentAt = new Date('2024-05-01T10:00:00.000Z');
    const createdAt = new Date('2024-05-01T10:00:01.000Z');
    const updatedAt = new Date('2024-05-01T10:00:02.000Z');
    const row = transformMailLog({
      _id,
      to: 'a@example.com',
      subject: 'Hi',
      body: 'Body',
      status: 'failed',
      error: 'SMTP down',
      sentAt,
      createdAt,
      updatedAt,
      __v: 0,
    });
    expect(row).toEqual({
      id: '64b7f0c2a1b2c3d4e5f60718',
      to: 'a@example.com',
      subject: 'Hi',
      body: 'Body',
      status: 'failed',
      error: 'SMTP down',
      sentAt,
      createdAt,
      updatedAt,
    });
  });

  it('keeps logs without an error and falls back sentAt to createdAt', () => {
    const createdAt = new Date('2024-05-01T10:00:01.000Z');
    const row = transformMailLog({
      _id,
      to: 'a@example.com',
      subject: 'Hi',
      body: 'B',
      status: 'sent',
      createdAt,
    })!;
    expect(row.error).toBeNull();
    expect(row.sentAt).toEqual(createdAt);
  });

  it('falls back to the ObjectId timestamp when no dates exist', () => {
    const row = transformMailLog({
      _id,
      to: 'a@example.com',
      subject: 's',
      body: 'b',
      status: 'sent',
    })!;
    expect(row.sentAt).toEqual(_id.getTimestamp());
    expect(row.createdAt).toEqual(_id.getTimestamp());
  });

  it('preserves large bodies and strips NULs', () => {
    const body = 'y'.repeat(50000) + '\u0000';
    const row = transformMailLog({
      _id,
      to: 'a@example.com',
      subject: 's',
      body,
      status: 'sent',
    })!;
    expect(row.body).toBe('y'.repeat(50000));
  });

  it.each([
    ['no _id', { to: 'a@b.c', status: 'sent' }],
    ['missing recipient', { _id, status: 'sent' }],
    ['invalid status', { _id, to: 'a@b.c', status: 'queued' }],
    ['missing status', { _id, to: 'a@b.c' }],
  ])('skips a document with %s', (_label, doc) => {
    expect(transformMailLog(doc)).toBeNull();
  });

  it('has no user dependency (logs are not owned)', () => {
    expect(mailLogMigrator).toMatchObject({
      name: 'mail-logs',
      collection: 'maillogs',
      dependsOn: [],
    });
  });
});
