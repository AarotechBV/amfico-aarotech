import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  CreateUserDto,
  CredentialPayload,
  ResetPasswordDto,
  UpdateUserDto,
  UserSummary,
} from './dtos/user.dto';
import { UsersService } from './users.service';

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ description: 'List all users' })
  list(): Promise<UserSummary[]> {
    return this.users.listUsers();
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
