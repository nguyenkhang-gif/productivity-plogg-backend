import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../core/domain/enums/user-role.enum';

export { UserRole };

export const ROLES_KEY = 'roles';
// Accept both the enum members and their raw string values (e.g. @Roles('admin') or @Roles(UserRole.Admin))
export const Roles = (...roles: (UserRole | `${UserRole}`)[]) =>
  SetMetadata(ROLES_KEY, roles);
