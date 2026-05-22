import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { OfficeApiKeyController } from './office-api-key.controller';
import { OfficeUsersController } from './office-users.controller';

@Module({
  imports: [AdminModule],
  controllers: [OfficeUsersController, OfficeApiKeyController],
})
export class OfficeModule {}
