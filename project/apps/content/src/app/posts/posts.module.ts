import { forwardRef, Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostsRepository } from './repositories/posts.repository';
import { InMemoryPostsRepository } from './repositories/in-memory-posts.repository';
import { CommentsModule } from '../comments/comments.module';
import { LikesModule } from '../likes/likes.module';

@Module({
  imports: [forwardRef(() => CommentsModule), forwardRef(() => LikesModule)],
  controllers: [PostsController],
  providers: [
    PostsService,
    { provide: PostsRepository, useClass: InMemoryPostsRepository },
  ],
  exports: [PostsService],
})
export class PostsModule {}
