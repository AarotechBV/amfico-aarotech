import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class CreateOfficeDto {
  @ApiProperty({ example: 'Amfico Brugge' })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiProperty({
    description:
      'AdminPulse API key for this office. Required: an office is unusable without it.',
  })
  @IsString()
  @MinLength(10)
  apiKey!: string;
}

export class UpdateOfficeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export interface OfficeSummary {
  id: string;
  name: string;
  isActive: boolean;
  userCount: number;
  hasApiKey: boolean;
  apiKeyLastUsedAt: string | null;
  createdAt: string;
}
