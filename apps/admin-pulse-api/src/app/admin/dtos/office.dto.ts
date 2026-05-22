import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateOfficeDto {
  @ApiProperty({ example: 'Amfico Brugge' })
  @IsString()
  @Length(1, 120)
  name!: string;
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
  apiKeyLabel: string | null;
  apiKeyLastUsedAt: string | null;
  createdAt: string;
}
