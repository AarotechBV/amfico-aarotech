import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  CreateUserDto,
  CredentialPayload,
  ResetPasswordDto,
  UpdateUserDto,
  UserSummary,
} from './dtos/user.dto';
import { UsersService } from './users.service';

/**
 * Cross-office user management. Super admin only.
 */
@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, SuperAdminGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ description: 'List users, optionally filtered by office' })
  list(@Query('officeId') officeId?: string): Promise<UserSummary[]> {
    return this.users.listUsers(officeId ? { officeId } : {});
  }

  @Post()
  create(@Body() dto: CreateUserDto): Promise<CredentialPayload> {
    return this.users.createUser(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<void> {
    await this.users.assertExists(id);
    return this.users.updateUser(id, dto);
  }

  @Post(':id/reset-password')
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<CredentialPayload> {
    await this.users.assertExists(id);
    return this.users.resetPassword(id, dto.password);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.users.deleteUser(id);
  }
}
