import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class SetApiKeyDto {
  @ApiProperty({
    description: 'Plaintext AdminPulse API key. Encrypted server-side before storage.',
  })
  @IsString()
  @MinLength(10)
  key!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  label?: string;
}

export interface ApiKeyMetadata {
  hasKey: boolean;
  label: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
