import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from '../users/repositories/users.repository';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';
const ACCESS_SECRET = () => process.env.JWT_SECRET ?? 'dev-secret';
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const user = new UserEntity();
    user.email = dto.email;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.avatarId = dto.avatarId;
    user.registeredAt = new Date();
    await user.setPassword(dto.password);

    const created = await this.usersRepository.create(user);
    return created.toResponse();
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await user.comparePassword(dto.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        { secret: REFRESH_SECRET() },
      );

      const user = await this.usersRepository.findById(payload.sub);
      if (!user) throw new UnauthorizedException('Invalid refresh token');

      const valid = await user.compareRefreshToken(refreshToken);
      if (!valid) throw new UnauthorizedException('Invalid refresh token');

      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(user: UserEntity) {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: ACCESS_SECRET(),
      expiresIn: ACCESS_EXPIRES_IN,
    });

    const refreshPayload = { sub: user.id };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: REFRESH_SECRET(),
      expiresIn: REFRESH_EXPIRES_IN,
    });

    await user.setRefreshToken(refreshToken);
    await this.usersRepository.update(user.id, { refreshTokenHash: user.refreshTokenHash });

    return { accessToken, refreshToken };
  }
}
