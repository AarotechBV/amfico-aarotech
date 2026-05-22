import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({
    description:
      'Liveness probe. Returns { ok: true } when the process is up. Does not check downstream connectivity.',
  })
  check(): { ok: true; uptimeSeconds: number; timestamp: string } {
    return {
      ok: true,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
