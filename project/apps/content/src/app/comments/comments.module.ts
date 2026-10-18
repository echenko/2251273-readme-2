import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './repositories/comments.repository';
import { InMemoryCommentsRepository } from './repositories/in-memory-comments.repository';

@Module({
  controllers: [CommentsController],
  providers: [
    CommentsService,
    { provide: CommentsRepository, useClass: InMemoryCommentsRepository },
  ],
  exports: [CommentsService],
})
export class CommentsModule {}
