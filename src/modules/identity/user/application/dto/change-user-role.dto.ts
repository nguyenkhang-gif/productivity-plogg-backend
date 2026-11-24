import { IsEnum } from 'class-validator';
import { UserRole } from 'src/shared/security/user-role.enum';

export class ChangeUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
