import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './repositories/users.repository';
import { InMemoryUsersRepository } from './repositories/in-memory-users.repository';
import { MongooseUsersRepository } from './repositories/mongoose-users.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { InMemorySubscriptionsRepository } from './repositories/in-memory-subscriptions.repository';
import { MongooseSubscriptionsRepository } from './repositories/mongoose-subscriptions.repository';
import { User, UserSchema } from './schemas/user.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    InMemoryUsersRepository,
    MongooseUsersRepository,
    InMemorySubscriptionsRepository,
    MongooseSubscriptionsRepository,
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
    {
      provide: SubscriptionsRepository,
      useFactory: (
        config: ConfigService,
        mongoRepo: MongooseSubscriptionsRepository,
        memRepo: InMemorySubscriptionsRepository,
      ): SubscriptionsRepository => {
        return config.get<string>('USE_MONGODB') === 'true' ? mongoRepo : memRepo;
      },
      inject: [
        ConfigService,
        MongooseSubscriptionsRepository,
        InMemorySubscriptionsRepository,
      ],
    },
  ],
  exports: [UsersService, UsersRepository, SubscriptionsRepository],
})
export class UsersModule {}
