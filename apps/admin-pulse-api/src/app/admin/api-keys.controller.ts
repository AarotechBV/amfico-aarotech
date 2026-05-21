import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { ApiKeyMetadata, SetApiKeyDto } from './dtos/api-key.dto';
import { ApiKeysService } from './api-keys.service';
import { UsersService } from './users.service';

@ApiTags('admin/api-keys')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/users/:userId/api-key')
export class ApiKeysController {
  constructor(
    private readonly apiKeys: ApiKeysService,
    private readonly users: UsersService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Key metadata. The plaintext key is never returned.',
  })
  async get(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApiKeyMetadata> {
    await this.users.assertExists(userId);
    return this.apiKeys.getMetadata(userId);
  }

  @Put()
  async set(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetApiKeyDto,
  ): Promise<ApiKeyMetadata> {
    await this.users.assertExists(userId);
    return this.apiKeys.upsertKey(userId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.users.assertExists(userId);
    await this.apiKeys.deleteKey(userId);
  }
}
