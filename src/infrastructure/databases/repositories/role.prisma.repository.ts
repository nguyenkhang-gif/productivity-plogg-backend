import { Injectable } from '@nestjs/common';
import {
  CreateRoleData,
  RoleRepository,
} from 'src/core/domain/repositories/role.repository.interface';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from 'src/core/domain/entities/role.entity';

@Injectable()
export class RolePrismaRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): Role {
    return new Role({
      id: row.id,
      guildId: row.guildId,
      name: row.name,
      color: row.color,
      position: row.position,
      permissions: row.permissions,
      isDefault: row.isDefault,
    });
  }

  async create(data: CreateRoleData): Promise<Role> {
    const row = await this.prisma.role.create({ data });
    return this.map(row);
  }

  async findDefaultByGuild(guildId: string): Promise<Role | null> {
    const row = await this.prisma.role.findFirst({
      where: { guildId, isDefault: true },
    });

    return row ? this.map(row) : null;
  }
}
