import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  CreateOfficeDto,
  OfficeSummary,
  UpdateOfficeDto,
} from './dtos/office.dto';
import { OfficesService } from './offices.service';

@ApiTags('admin/offices')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, SuperAdminGuard)
@Controller('admin/offices')
export class OfficesController {
  constructor(private readonly offices: OfficesService) {}

  @Get()
  @ApiOkResponse({ description: 'All offices' })
  list(): Promise<OfficeSummary[]> {
    return this.offices.listOffices();
  }

  @Post()
  create(@Body() dto: CreateOfficeDto): Promise<OfficeSummary> {
    return this.offices.createOffice(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficeDto,
  ): Promise<void> {
    await this.offices.assertExists(id);
    return this.offices.updateOffice(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.offices.assertExists(id);
    return this.offices.deleteOffice(id);
  }
}
