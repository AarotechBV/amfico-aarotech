import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CompanyDto } from '@amfico@aarotech/admin-pulse-shared';
import { AdminPulseAuthGuard } from '../admin-pulse/admin-pulse-auth.guard';
import { AdminPulseToken } from '../admin-pulse/admin-pulse-token.decorator';
import { CompaniesClient } from '../admin-pulse/clients/companies.client';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(AdminPulseAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesClient) {}

  @Get()
  @ApiOkResponse({ description: 'List all AdminPulse companies.' })
  list(@AdminPulseToken() token: string): Promise<CompanyDto[]> {
    return this.companies.listAll(token);
  }
}
