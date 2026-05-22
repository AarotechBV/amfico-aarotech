import { Module } from '@nestjs/common';
import { OfficesController } from './offices.controller';
import { OfficesService } from './offices.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, OfficesController],
  providers: [UsersService, OfficesService],
  exports: [UsersService, OfficesService],
})
export class AdminModule {}
