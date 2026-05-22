import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
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

export interface UserOfficeRef {
  id: string;
  name: string;
}

/** Used by /api/admin/users (super_admin only). */
export class CreateUserDto {
  @ApiProperty({ example: 'jan@amfico.be' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jan' })
  @IsString()
  @Length(1, 80)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Janssens' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  lastName?: string;

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
    type: [String],
    description:
      'Office UUIDs the user is a member of. Required for non-super_admin (at least one). Must be omitted/empty for super_admin.',
  })
  @ValidateIf((o: CreateUserDto) => o.role !== 'super_admin')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  officeIds?: string[];
}

/** Used by /api/admin/users/:id PATCH (super_admin only). */
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  firstName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(0, 80)
  lastName?: string | null;

  @ApiPropertyOptional({ enum: APP_ROLES })
  @IsOptional()
  @IsIn(APP_ROLES)
  role?: AppRole;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Replace the user\'s office memberships. Must be empty for super_admin and non-empty for everyone else.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  officeIds?: string[];

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
  firstName: string | null;
  lastName: string | null;
  /** Computed: trim(firstName + ' ' + lastName) or null if both empty. */
  fullName: string | null;
  role: AppRole;
  offices: UserOfficeRef[];
  isActive: boolean;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface CredentialPayload {
  email: string;
  password: string;
}

/** Builds the display name from first + last. Null when both empty. */
export const buildFullName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null => {
  const joined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return joined.length > 0 ? joined : null;
};
