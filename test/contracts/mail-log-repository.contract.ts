import { newObjectId } from 'src/shared/database/object-id';
import { MailLog } from 'src/modules/labs/mail/domain/mail-log.entity';
import type { MailLogRepository } from 'src/modules/labs/mail/domain/mail-log.repository.interface';

export interface MailLogRepositoryHarness {
  repo: MailLogRepository;
  /** Must delete every log whose recipient starts with `contract_`. */
  cleanup(): Promise<void>;
}

/** Behaviour every MailLogRepository implementation must satisfy. */
export function describeMailLogRepositoryContract(
  name: string,
  factory: () => Promise<MailLogRepositoryHarness>,
): void {
  describe(`MailLogRepository contract: ${name}`, () => {
    let h: MailLogRepositoryHarness;
    let repo: MailLogRepository;
    let tag: string;

    const to = (n: string) => `contract_${tag}_${n}@example.com`;
    const make = (overrides: Partial<MailLog> = {}) =>
      new MailLog({
        to: to('a'),
        subject: 'Hello',
        body: 'Body text',
        status: 'sent',
        sentAt: new Date('2024-05-01T10:00:00.000Z'),
        ...overrides,
      });

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
    });

    beforeEach(() => {
      tag = newObjectId().slice(-8);
    });

    afterAll(async () => {
      await h.cleanup();
    });

    describe('save', () => {
      it('persists a sent log with a 24-hex id', async () => {
        const saved = await repo.save(make());
        expect(saved.id).toMatch(/^[0-9a-f]{24}$/);
        expect(saved).toMatchObject({
          to: to('a'),
          subject: 'Hello',
          body: 'Body text',
          status: 'sent',
          sentAt: new Date('2024-05-01T10:00:00.000Z'),
        });
        expect(saved.error).toBeUndefined();
      });

      it('persists a failed log with its error and a long body', async () => {
        const body = 'x'.repeat(20000);
        const saved = await repo.save(
          make({ status: 'failed', error: 'SMTP down', body }),
        );
        expect(saved.status).toBe('failed');
        expect(saved.error).toBe('SMTP down');
        expect(saved.body).toBe(body);
      });

      it('is append-only: every save inserts a new row', async () => {
        const a = await repo.save(make());
        const b = await repo.save(make());
        expect(a.id).not.toBe(b.id);
        expect(await repo.findByRecipient(to('a'))).toHaveLength(2);
      });

      it('exposes no update or delete operation', () => {
        const api = repo as unknown as Record<string, unknown>;
        expect(api.update).toBeUndefined();
        expect(api.delete).toBeUndefined();
        expect(api.remove).toBeUndefined();
      });
    });

    describe('listing', () => {
      it('findByRecipient filters by exact recipient, newest sentAt first', async () => {
        const old = await repo.save(
          make({ sentAt: new Date('2024-01-01T00:00:00.000Z') }),
        );
        const recent = await repo.save(
          make({ sentAt: new Date('2024-06-01T00:00:00.000Z') }),
        );
        const mid = await repo.save(
          make({ sentAt: new Date('2024-03-01T00:00:00.000Z') }),
        );
        await repo.save(make({ to: to('other') }));

        const logs = await repo.findByRecipient(to('a'));
        expect(logs.map((l) => l.id)).toEqual([recent.id, mid.id, old.id]);
        expect(await repo.findByRecipient(to('nobody'))).toEqual([]);
        // exact match only: a prefix must not match
        expect(await repo.findByRecipient(`contract_${tag}`)).toEqual([]);
      });

      it('findAll includes every log, newest sentAt first', async () => {
        const a = await repo.save(
          make({ to: to('a'), sentAt: new Date('2030-01-01T00:00:00.000Z') }),
        );
        const b = await repo.save(
          make({ to: to('b'), sentAt: new Date('2030-02-01T00:00:00.000Z') }),
        );
        const all = await repo.findAll();
        const mine = all.filter((l) => l.to.startsWith(`contract_${tag}`));
        expect(mine.map((l) => l.id)).toEqual([b.id, a.id]);
        const times = all.map((l) => l.sentAt.getTime());
        expect([...times].sort((x, y) => y - x)).toEqual(times);
      });
    });
  });
}
