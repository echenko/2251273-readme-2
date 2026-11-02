import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './repositories/comments.repository';
import { InMemoryCommentsRepository } from './repositories/in-memory-comments.repository';
import { PrismaCommentsRepository } from './repositories/prisma-comments.repository';

@Module({
  imports: [ConfigModule],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    InMemoryCommentsRepository,
    PrismaCommentsRepository,
    {
      provide: CommentsRepository,
      useFactory: (
        config: ConfigService,
        prismaRepo: PrismaCommentsRepository,
        memRepo: InMemoryCommentsRepository,
      ) => (config.get('USE_PRISMA') === 'true' ? prismaRepo : memRepo),
      inject: [ConfigService, PrismaCommentsRepository, InMemoryCommentsRepository],
    },
  ],
  exports: [CommentsService],
})
export class CommentsModule {}
