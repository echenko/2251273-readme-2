import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SERVICES } from '../common/clients/services';

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(private readonly http: HttpService) {}

  @Post('posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать комментарий (proxy → content)' })
  @ApiParam({ name: 'postId', description: 'UUID поста' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Ошибка валидации' })
  async create(
    @Param('postId') postId: string,
    @Headers('authorization') auth: string,
    @Body() body: unknown,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${SERVICES.content}/posts/${postId}/comments`, body, {
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

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Список комментариев (proxy → content)' })
  @ApiParam({ name: 'postId', description: 'UUID поста' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Param('postId') postId: string,
    @Query() query: Record<string, unknown>,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.content}/posts/${postId}/comments`, {
          params: query,
        }),
      );
      return data;
    } catch (error: unknown) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить комментарий (proxy → content)' })
  @ApiParam({ name: 'id', description: 'UUID комментария' })
  async remove(@Param('id') id: string, @Headers('authorization') auth: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.delete(`${SERVICES.content}/comments/${id}`, {
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
}
