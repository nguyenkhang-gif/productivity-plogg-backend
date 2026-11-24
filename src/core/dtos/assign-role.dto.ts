import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  roleId: string;
}
