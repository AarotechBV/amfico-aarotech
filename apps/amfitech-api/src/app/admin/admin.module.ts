import { Module } from '@nestjs/common';
import { OfficeApiKeyService } from '../office/office-api-key.service';
import { OfficesController } from './offices.controller';
import { OfficesService } from './offices.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, OfficesController],
  providers: [UsersService, OfficesService, OfficeApiKeyService],
  exports: [UsersService, OfficesService, OfficeApiKeyService],
})
export class AdminModule {}
