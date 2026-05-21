import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { SUPABASE_ADMIN } from './supabase.module';

export interface MeResponse {
  userId: string;
  email: string;
  fullName: string | null;
  role: 'user' | 'admin';
  hasApiKey: boolean;
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
  @ApiOkResponse({ description: 'Currently logged-in user' })
  async me(@Req() req: Request): Promise<MeResponse> {
    const ctx = req.authContext;
    if (!ctx) {
      throw new Error('Auth context not set');
    }
    const [{ data: profile }, { data: keyRow }] = await Promise.all([
      this.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ctx.userId)
        .single(),
      this.supabase
        .from('admin_pulse_keys')
        .select('id')
        .eq('user_id', ctx.userId)
        .maybeSingle(),
    ]);

    return {
      userId: ctx.userId,
      email: ctx.email,
      fullName: profile?.full_name ?? null,
      role: ctx.role,
      hasApiKey: !!keyRow,
    };
  }
}
