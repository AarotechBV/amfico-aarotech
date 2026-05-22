import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetOfficeApiKeyDto {
  @ApiProperty({
    description:
      'Plaintext AdminPulse API key. Encrypted server-side before storage.',
  })
  @IsString()
  @MinLength(10)
  key!: string;
}

export interface OfficeApiKeyMetadata {
  hasKey: boolean;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
