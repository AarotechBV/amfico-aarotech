import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { OfficeApiKeyController } from './office-api-key.controller';
import { OfficeApiKeyService } from './office-api-key.service';
import { OfficeUsersController } from './office-users.controller';

@Module({
  imports: [AdminModule],
  controllers: [OfficeUsersController, OfficeApiKeyController],
  providers: [OfficeApiKeyService],
})
export class OfficeModule {}
