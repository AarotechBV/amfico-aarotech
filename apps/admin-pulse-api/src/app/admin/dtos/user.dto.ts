import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MinLength,
  ValidateIf,
} from 'class-validator';

export type AppRole = 'user' | 'admin' | 'super_admin';
export const APP_ROLES: AppRole[] = ['user', 'admin', 'super_admin'];

/** Used by /api/admin/users (super_admin only). */
export class CreateUserDto {
  @ApiProperty({ example: 'jan@amfico.be' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'If omitted, a random password is generated and returned once.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ enum: APP_ROLES })
  @IsIn(APP_ROLES)
  role!: AppRole;

  @ApiPropertyOptional({
    description:
      'Required for non-super_admin roles. Must be omitted/null for super_admin.',
  })
  @ValidateIf((o: CreateUserDto) => o.role !== 'super_admin')
  @IsUUID()
  officeId?: string;
}

/** Used by /api/admin/users/:id PATCH (super_admin only). */
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  fullName?: string;

  @ApiPropertyOptional({ enum: APP_ROLES })
  @IsOptional()
  @IsIn(APP_ROLES)
  role?: AppRole;

  @ApiPropertyOptional({
    description:
      'Move the user to a different office. Pass null to clear (only valid when role is super_admin).',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  officeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({
    description:
      'New password. If omitted, the server generates a random one and returns it once.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  officeId: string | null;
  officeName: string | null;
  isActive: boolean;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface CredentialPayload {
  email: string;
  password: string;
}
