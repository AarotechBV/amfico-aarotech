import { Module } from '@nestjs/common';
import { AdminPulseModule } from '../admin-pulse/admin-pulse.module';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';

@Module({
  imports: [AdminPulseModule],
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class OverviewModule {}
