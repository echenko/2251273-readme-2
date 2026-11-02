import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { LikesRepository } from './repositories/likes.repository';
import { InMemoryLikesRepository } from './repositories/in-memory-likes.repository';
import { PrismaLikesRepository } from './repositories/prisma-likes.repository';

@Module({
  imports: [ConfigModule],
  controllers: [LikesController],
  providers: [
    LikesService,
    InMemoryLikesRepository,
    PrismaLikesRepository,
    {
      provide: LikesRepository,
      useFactory: (
        config: ConfigService,
        prismaRepo: PrismaLikesRepository,
        memRepo: InMemoryLikesRepository,
      ) => (config.get('USE_PRISMA') === 'true' ? prismaRepo : memRepo),
      inject: [ConfigService, PrismaLikesRepository, InMemoryLikesRepository],
    },
  ],
  exports: [LikesService],
})
export class LikesModule {}
