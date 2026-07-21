import { Injectable } from '@nestjs/common';
import {
  CreateRoleData,
  RoleRepository,
  UpdateRoleData,
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

  async findById(id: string): Promise<Role | null> {
    const row = await this.prisma.role.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async findByGuild(guildId: string): Promise<Role[]> {
    const rows = await this.prisma.role.findMany({
      where: { guildId },
      orderBy: { position: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async update(id: string, data: UpdateRoleData): Promise<Role> {
    const row = await this.prisma.role.update({ where: { id }, data });
    return this.map(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }
}
