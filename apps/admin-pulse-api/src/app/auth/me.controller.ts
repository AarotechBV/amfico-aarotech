import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { AppRole } from './auth-resolver.service';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { SUPABASE_ADMIN } from './supabase.module';

export interface OfficeSummary {
  id: string;
  name: string;
  isActive: boolean;
  hasApiKey: boolean;
}

export interface MeResponse {
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  homeOfficeId: string | null;
  /**
   * For super_admin: every office in the system. For admin/user: only
   * their home office. The frontend uses this to populate the office
   * switcher (super_admin) or to show "Kantoor: X" (admin/user).
   */
  offices: OfficeSummary[];
}

@ApiTags('auth')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('auth')
export class MeController {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  @Get('me')
  @ApiOkResponse({ description: 'Currently logged-in user + visible offices' })
  async me(@Req() req: Request): Promise<MeResponse> {
    const ctx = req.authContext;
    if (!ctx) throw new Error('Auth context not set');

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ctx.userId)
      .single();

    let officesQuery = this.supabase
      .from('offices')
      .select('id, name, is_active, admin_pulse_keys(office_id)')
      .order('name');

    if (ctx.role !== 'super_admin' && ctx.homeOfficeId) {
      officesQuery = officesQuery.eq('id', ctx.homeOfficeId);
    }

    const { data: rows } = await officesQuery;
    const offices: OfficeSummary[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      isActive: r.is_active as boolean,
      hasApiKey: Array.isArray(r.admin_pulse_keys)
        ? r.admin_pulse_keys.length > 0
        : !!r.admin_pulse_keys,
    }));

    return {
      userId: ctx.userId,
      email: ctx.email,
      fullName: profile?.full_name ?? null,
      role: ctx.role,
      homeOfficeId: ctx.homeOfficeId,
      offices,
    };
  }
}
