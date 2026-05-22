import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsISO8601, IsOptional, IsString } from 'class-validator';
import { Hierarchy, Relation } from '@amfico@aarotech/amfitech-shared';

export class RegistrationsOverviewQueryDto {
  @ApiProperty({
    example: '2026-04-30',
    description: 'ISO date (yyyy-MM-dd). Registrations up to and including this day.',
  })
  @IsISO8601({ strict: true })
  registrationDateUntil!: string;

  @ApiProperty({
    description: 'Filter to relations belonging to a single company.',
  })
  @IsString()
  companyId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  invoiced?: boolean = false;
}

export interface RegistrationsOverviewResponseDto {
  hierarchy: Hierarchy;
  relations: Relation[];
}
