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

export type AppRole = 'user' | 'admin';

export class CreateUserDto {
  @ApiProperty({ example: 'jan@amfico.be' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  fullName?: string;

  @ApiPropertyOptional({ description: 'If omitted, a random password is generated.' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ enum: ['user', 'admin'], default: 'user' })
  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: AppRole;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  fullName?: string;

  @ApiPropertyOptional({ enum: ['user', 'admin'] })
  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: AppRole;

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
  isActive: boolean;
  hasApiKey: boolean;
  apiKeyLabel: string | null;
  lastSignInAt: string | null;
  apiKeyLastUsedAt: string | null;
  createdAt: string;
}

/** Returned once after create or password reset. Plaintext password never persists. */
export interface CredentialPayload {
  email: string;
  password: string;
}
