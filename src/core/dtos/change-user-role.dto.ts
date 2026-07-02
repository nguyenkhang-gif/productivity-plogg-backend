import { IsEnum } from 'class-validator';
import { UserRole } from '../domain/enums/user-role.enum';

export class ChangeUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
