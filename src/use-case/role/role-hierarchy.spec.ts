import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GuildPermissions as P } from 'src/core/domain/constants/guild-permissions';
import { AssignRoleUseCase } from 'src/use-case/guild-member/assign-role.use-case';
import { CreateRoleUseCase } from './create-role.use-case';
import { UpdateRoleUseCase } from './update-role.use-case';

describe('role hierarchy', () => {
  const guild = { id: 'g1', ownerId: 'owner' };
  const guildRepo = { findById: jest.fn() };
  const memberRepo = {
    getRolePermissions: jest.fn(),
    getHighestRolePosition: jest.fn(),
    isMember: jest.fn(),
    assignRole: jest.fn(),
  };
  const roleRepo = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
  };

  const create = new CreateRoleUseCase(
    roleRepo as any,
    memberRepo as any,
    guildRepo as any,
  );
  const update = new UpdateRoleUseCase(
    roleRepo as any,
    memberRepo as any,
    guildRepo as any,
  );
  const assign = new AssignRoleUseCase(
    memberRepo as any,
    guildRepo as any,
    roleRepo as any,
  );

  function actorWith(perms: bigint, position: number) {
    memberRepo.getRolePermissions.mockResolvedValue(perms);
    memberRepo.getHighestRolePosition.mockImplementation(
      async (_g: string, userId: string) =>
        userId === 'actor' ? position : userId === 'target' ? 3 : -1,
    );
  }

  beforeEach(() => {
    jest.resetAllMocks();
    guildRepo.findById.mockResolvedValue(guild);
    memberRepo.isMember.mockResolvedValue(true);
    roleRepo.create.mockResolvedValue({});
    roleRepo.update.mockResolvedValue({});
  });

  describe('create role', () => {
    it('prevents MANAGE_ROLES from granting ADMINISTRATOR', async () => {
      actorWith(P.MANAGE_ROLES, 5);
      await expect(
        create.execute({
          guildId: 'g1',
          actorId: 'actor',
          name: 'x',
          position: 1,
          permissions: P.ADMINISTRATOR,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(roleRepo.create).not.toHaveBeenCalled();
    });

    it('prevents granting permission bits the actor lacks', async () => {
      actorWith(P.MANAGE_ROLES, 5);
      await expect(
        create.execute({
          guildId: 'g1',
          actorId: 'actor',
          name: 'x',
          position: 1,
          permissions: P.KICK_MEMBERS,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents creating a role at or above the actor position', async () => {
      actorWith(P.MANAGE_ROLES | P.SEND_MESSAGES, 5);
      await expect(
        create.execute({
          guildId: 'g1',
          actorId: 'actor',
          name: 'x',
          position: 5,
          permissions: P.SEND_MESSAGES,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a valid lower role', async () => {
      actorWith(P.MANAGE_ROLES | P.SEND_MESSAGES, 5);
      await create.execute({
        guildId: 'g1',
        actorId: 'actor',
        name: 'x',
        position: 4,
        permissions: P.SEND_MESSAGES,
      });
      expect(roleRepo.create).toHaveBeenCalled();
    });

    it('lets the owner grant ADMINISTRATOR', async () => {
      await create.execute({
        guildId: 'g1',
        actorId: 'owner',
        name: 'admin',
        position: 99,
        permissions: P.ADMINISTRATOR,
      });
      expect(roleRepo.create).toHaveBeenCalled();
    });
  });

  describe('update role', () => {
    it('blocks elevating the default role', async () => {
      roleRepo.findById.mockResolvedValue({
        id: 'r1',
        guildId: 'g1',
        position: 0,
        permissions: P.VIEW_CHANNELS,
        isDefault: true,
      });
      await expect(
        update.execute('r1', 'g1', 'owner', {
          permissions: P.VIEW_CHANNELS | P.MANAGE_MESSAGES,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks editing a role at or above the actor position', async () => {
      actorWith(P.MANAGE_ROLES, 5);
      roleRepo.findById.mockResolvedValue({
        id: 'r1',
        guildId: 'g1',
        position: 5,
        permissions: 0n,
        isDefault: false,
      });
      await expect(
        update.execute('r1', 'g1', 'actor', { name: 'y' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks moving a role above the actor', async () => {
      actorWith(P.MANAGE_ROLES, 5);
      roleRepo.findById.mockResolvedValue({
        id: 'r1',
        guildId: 'g1',
        position: 2,
        permissions: 0n,
        isDefault: false,
      });
      await expect(
        update.execute('r1', 'g1', 'actor', { position: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assign role', () => {
    it('blocks assigning a role above the actor', async () => {
      actorWith(P.MANAGE_ROLES, 5);
      roleRepo.findById.mockResolvedValue({
        id: 'r1',
        guildId: 'g1',
        position: 7,
      });
      await expect(
        assign.execute('g1', 'actor', 'target', 'r1'),
      ).rejects.toThrow(ForbiddenException);
      expect(memberRepo.assignRole).not.toHaveBeenCalled();
    });

    it('blocks managing a member at or above the actor', async () => {
      actorWith(P.MANAGE_ROLES, 3);
      roleRepo.findById.mockResolvedValue({
        id: 'r1',
        guildId: 'g1',
        position: 1,
      });
      await expect(
        assign.execute('g1', 'actor', 'target', 'r1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects roles from another guild', async () => {
      actorWith(P.MANAGE_ROLES, 5);
      roleRepo.findById.mockResolvedValue({
        id: 'r1',
        guildId: 'other',
        position: 1,
      });
      await expect(
        assign.execute('g1', 'actor', 'target', 'r1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows a valid assignment', async () => {
      actorWith(P.MANAGE_ROLES, 5);
      roleRepo.findById.mockResolvedValue({
        id: 'r1',
        guildId: 'g1',
        position: 1,
      });
      await assign.execute('g1', 'actor', 'target', 'r1');
      expect(memberRepo.assignRole).toHaveBeenCalledWith('g1', 'target', 'r1');
    });
  });
});
