import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DEFAULT_JWT_SECRET, JWT_EXPIRES_IN } from '@readme/shared-types';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { LikesModule } from './likes/likes.module';
import { JwtStrategy } from './auth/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
    PostsModule,
    CommentsModule,
    LikesModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
