import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { OfficeAdminGuard } from '../auth/guards/office-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  CredentialPayload,
  ResetPasswordDto,
  UserSummary,
} from '../admin/dtos/user.dto';
import { UsersService } from '../admin/users.service';
import {
  CreateOfficeUserDto,
  UpdateOfficeUserDto,
} from './dtos/office-user.dto';

/**
 * Office-scoped user management. Admin or super_admin; always operates
 * on the active office (from X-Active-Office header for super_admin,
 * from profile.office_id for admin).
 */
@ApiTags('office/users')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, OfficeAdminGuard)
@Controller('office/users')
export class OfficeUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ description: 'Users in the active office' })
  list(@Req() req: Request): Promise<UserSummary[]> {
    return this.users.listUsers({
      officeId: req.authContext!.activeOfficeId!,
    });
  }

  @Post()
  create(
    @Req() req: Request,
    @Body() dto: CreateOfficeUserDto,
  ): Promise<CredentialPayload> {
    return this.users.createUser({
      email: dto.email,
      fullName: dto.fullName,
      password: dto.password,
      role: dto.role ?? 'user',
      officeId: req.authContext!.activeOfficeId!,
    });
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficeUserDto,
  ): Promise<void> {
    const officeId = req.authContext!.activeOfficeId!;
    await this.users.assertExists(id);
    await this.users.assertBelongsToOffice(id, officeId);
    return this.users.updateUser(id, {
      fullName: dto.fullName,
      role: dto.role,
      isActive: dto.isActive,
    });
  }

  @Post(':id/reset-password')
  async resetPassword(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<CredentialPayload> {
    const officeId = req.authContext!.activeOfficeId!;
    await this.users.assertExists(id);
    await this.users.assertBelongsToOffice(id, officeId);
    return this.users.resetPassword(id, dto.password);
  }

  @Delete(':id')
  async delete(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const officeId = req.authContext!.activeOfficeId!;
    await this.users.assertExists(id);
    await this.users.assertBelongsToOffice(id, officeId);
    return this.users.deleteUser(id);
  }
}
