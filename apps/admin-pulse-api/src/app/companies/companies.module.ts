import { Module } from '@nestjs/common';
import { AdminPulseModule } from '../admin-pulse/admin-pulse.module';
import { CompaniesController } from './companies.controller';

@Module({
  imports: [AdminPulseModule],
  controllers: [CompaniesController],
})
export class CompaniesModule {}
