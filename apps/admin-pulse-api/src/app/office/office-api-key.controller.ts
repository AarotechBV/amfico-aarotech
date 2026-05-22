import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { OfficeAdminGuard } from '../auth/guards/office-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  OfficeApiKeyMetadata,
  SetOfficeApiKeyDto,
} from './dtos/office-api-key.dto';
import { OfficeApiKeyService } from './office-api-key.service';

/**
 * Manage the AdminPulse API key for the active office. Admin or
 * super_admin; super_admin operates on whichever office the
 * X-Active-Office header points to.
 */
@ApiTags('office/api-key')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OfficeAdminGuard)
@Controller('office/api-key')
export class OfficeApiKeyController {
  constructor(private readonly service: OfficeApiKeyService) {}

  @Get()
  @ApiOkResponse({
    description: 'Key metadata for the active office. Plaintext key never returned.',
  })
  get(@Req() req: Request): Promise<OfficeApiKeyMetadata> {
    return this.service.getMetadata(req.authContext!.activeOfficeId!);
  }

  @Put()
  set(
    @Req() req: Request,
    @Body() dto: SetOfficeApiKeyDto,
  ): Promise<OfficeApiKeyMetadata> {
    return this.service.upsertKey(req.authContext!.activeOfficeId!, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: Request): Promise<void> {
    return this.service.deleteKey(req.authContext!.activeOfficeId!);
  }
}
