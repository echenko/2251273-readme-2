import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DEFAULT_JWT_SECRET, JWT_EXPIRES_IN } from '@readme/shared-types';
import { FilesModule } from './files/files.module';
import { JwtStrategy } from './auth/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
    FilesModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
