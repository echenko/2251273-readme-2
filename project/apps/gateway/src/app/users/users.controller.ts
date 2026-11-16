import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SERVICES } from '../common/clients/services';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly http: HttpService) {}

  @Get('me/subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои подписки (proxy → users)' })
  async mySubscriptions(@Headers('authorization') auth: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.users}/users/me/subscriptions`, {
          headers: { Authorization: auth },
        }),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Get('me/feed-author-ids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ID авторов для ленты (proxy → users)' })
  async myFeedAuthorIds(@Headers('authorization') auth: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.users}/users/me/feed-author-ids`, {
          headers: { Authorization: auth },
        }),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Профиль пользователя (proxy → users)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Невалидный ObjectId' })
  @ApiResponse({ status: 404, description: 'Не найден' })
  async getUser(@Param('id') id: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.users}/users/${id}`),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Смена пароля (proxy → users)' })
  async changePassword(
    @Headers('authorization') auth: string,
    @Body() body: unknown,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.patch(`${SERVICES.users}/users/password`, body, {
          headers: { Authorization: auth },
        }),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Post(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подписаться (proxy → users)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  async subscribe(
    @Param('id') followingId: string,
    @Headers('authorization') auth: string,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${SERVICES.users}/users/${followingId}/subscribe`,
          {},
          { headers: { Authorization: auth } },
        ),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Delete(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отписаться (proxy → users)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  async unsubscribe(
    @Param('id') followingId: string,
    @Headers('authorization') auth: string,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.delete(`${SERVICES.users}/users/${followingId}/subscribe`, {
          headers: { Authorization: auth },
        }),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Get(':id/subscribers')
  @ApiOperation({ summary: 'Подписчики (proxy → users)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  async getSubscribers(@Param('id') id: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.users}/users/${id}/subscribers`),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Get(':id/subscriptions')
  @ApiOperation({ summary: 'Подписки (proxy → users)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  async getSubscriptions(@Param('id') id: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.users}/users/${id}/subscriptions`),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }
}
