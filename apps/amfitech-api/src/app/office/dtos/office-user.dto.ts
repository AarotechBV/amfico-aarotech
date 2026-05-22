import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

/** Roles an office admin is allowed to assign. */
export type OfficeAssignableRole = 'user' | 'admin';
export const OFFICE_ASSIGNABLE_ROLES: OfficeAssignableRole[] = ['user', 'admin'];

/** /api/office/users POST */
export class CreateOfficeUserDto {
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

  @ApiPropertyOptional({
    enum: OFFICE_ASSIGNABLE_ROLES,
    default: 'user',
    description: 'super_admin cannot be assigned here — use /api/admin/users.',
  })
  @IsOptional()
  @IsIn(OFFICE_ASSIGNABLE_ROLES)
  role?: OfficeAssignableRole;
}

/** /api/office/users/:id PATCH */
export class UpdateOfficeUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  firstName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 80)
  lastName?: string | null;

  @ApiPropertyOptional({ enum: OFFICE_ASSIGNABLE_ROLES })
  @IsOptional()
  @IsIn(OFFICE_ASSIGNABLE_ROLES)
  role?: OfficeAssignableRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
