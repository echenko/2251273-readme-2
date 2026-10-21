import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './repositories/users.repository';
import { InMemoryUsersRepository } from './repositories/in-memory-users.repository';
import { MongooseUsersRepository } from './repositories/mongoose-users.repository';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    InMemoryUsersRepository,
    MongooseUsersRepository,
    {
      provide: UsersRepository,
      useFactory: (
        config: ConfigService,
        mongoRepo: MongooseUsersRepository,
        memRepo: InMemoryUsersRepository,
      ): UsersRepository => {
        return config.get<string>('USE_MONGODB') === 'true' ? mongoRepo : memRepo;
      },
      inject: [ConfigService, MongooseUsersRepository, InMemoryUsersRepository],
    },
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
