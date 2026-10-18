import { Module } from '@nestjs/common';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { LikesRepository } from './repositories/likes.repository';
import { InMemoryLikesRepository } from './repositories/in-memory-likes.repository';

@Module({
  controllers: [LikesController],
  providers: [
    LikesService,
    { provide: LikesRepository, useClass: InMemoryLikesRepository },
  ],
  exports: [LikesService],
})
export class LikesModule {}
