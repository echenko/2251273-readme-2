import {
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
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

@ApiTags('likes')
@Controller('posts/:postId/likes')
export class LikesController {
  constructor(private readonly http: HttpService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Поставить лайк (proxy → content)' })
  @ApiParam({ name: 'postId', description: 'UUID поста' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Уже лайкнули' })
  async like(
    @Param('postId') postId: string,
    @Headers('authorization') auth: string,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${SERVICES.content}/posts/${postId}/likes`,
          {},
          { headers: { Authorization: auth } },
        ),
      );
      return data;
    } catch (error: unknown) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Убрать лайк (proxy → content)' })
  @ApiParam({ name: 'postId', description: 'UUID поста' })
  async unlike(
    @Param('postId') postId: string,
    @Headers('authorization') auth: string,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.delete(`${SERVICES.content}/posts/${postId}/likes`, {
          headers: { Authorization: auth },
        }),
      );
      return data;
    } catch (error: unknown) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Количество лайков (proxy → content)' })
  @ApiParam({ name: 'postId', description: 'UUID поста' })
  async count(@Param('postId') postId: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.content}/posts/${postId}/likes`),
      );
      return data;
    } catch (error: unknown) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }
}
