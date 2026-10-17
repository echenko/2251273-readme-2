import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './repositories/users.repository';
import { InMemoryUsersRepository } from './repositories/in-memory-users.repository';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: UsersRepository, useClass: InMemoryUsersRepository },
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
