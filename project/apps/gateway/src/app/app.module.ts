import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { ClientsModule } from './common/clients/clients.module';
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users/users.controller';
import { PostsController } from './posts/posts.controller';
import { CommentsController } from './comments/comments.controller';
import { LikesController } from './likes/likes.controller';
import { FeedController } from './feed/feed.controller';
import { GatewayPostsService } from './posts/posts.service';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/gateway/.env',
    }),
    PassportModule,
    ClientsModule,
  ],
  controllers: [
    AuthController,
    UsersController,
    PostsController,
    CommentsController,
    LikesController,
    FeedController,
  ],
  providers: [JwtStrategy, GatewayPostsService],
})
export class AppModule {}
