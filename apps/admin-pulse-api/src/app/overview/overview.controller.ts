import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AdminPulseAuthGuard } from '../admin-pulse/admin-pulse-auth.guard';
import { AdminPulseToken } from '../admin-pulse/admin-pulse-token.decorator';
import { OverviewService } from './overview.service';
import {
  RegistrationsOverviewQueryDto,
  RegistrationsOverviewResponseDto,
} from './registrations-overview.dto';

@ApiTags('overview')
@ApiBearerAuth()
@UseGuards(AdminPulseAuthGuard)
@Controller('registrations-overview')
export class OverviewController {
  constructor(private readonly service: OverviewService) {}

  @Get()
  @ApiOkResponse({
    description: 'Everything the Angular registrations overview page needs.',
  })
  getOverview(
    @AdminPulseToken() token: string,
    @Query() query: RegistrationsOverviewQueryDto,
  ): Promise<RegistrationsOverviewResponseDto> {
    return this.service.getRegistrationsOverview(token, query);
  }
}
