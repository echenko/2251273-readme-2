import { Post } from '@readme/shared-types';
import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SERVICES } from '../common/clients/services';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Моя лента (посты авторов, на которых подписан + свои)' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Лента' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getFeed(
    @Headers('authorization') auth: string,
    @Query() query: Record<string, unknown>,
  ) {
    // 1. Получить список authorIds из users
    const { data: authorIds } = await firstValueFrom(
      this.http.get<string[]>(`${SERVICES.users}/users/me/feed-author-ids`, {
        headers: { Authorization: auth },
      }),
    );

    if (!authorIds || authorIds.length === 0) {
      return { items: [], total: 0, limit: query.limit ?? 25, offset: query.offset ?? 0, totalPages: 0, hasNext: false };
    }

    // 2. Запросить посты из content
    const { data } = await firstValueFrom(
      this.http.get(`${SERVICES.content}/posts/feed`, {
        params: {
          ...query,
          authorIds: authorIds.join(','),
        },
      }),
    );

    // 3. Агрегация: author, likesCount, commentsCount
    const items = await Promise.all(
      (data.items ?? []).map(async (post: Post) => {
        const [author, likesCount, commentsCount] = await Promise.all([
          this.getAuthor(post.authorId),
          this.getLikesCount(post.id),
          this.getCommentsCount(post.id),
        ]);
        return { ...post, author, likesCount, commentsCount };
      }),
    );

    return { ...data, items };
  }

  private async getAuthor(authorId: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.users}/users/${authorId}`),
      );
      return {
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      };
    } catch {
      return { id: authorId };
    }
  }

  private async getLikesCount(postId: string): Promise<number> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.content}/posts/${postId}/likes`),
      );
      return data.count ?? 0;
    } catch {
      return 0;
    }
  }

  private async getCommentsCount(postId: string): Promise<number> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${SERVICES.content}/posts/${postId}/comments`, {
          params: { limit: 1 },
        }),
      );
      return data.total ?? 0;
    } catch {
      return 0;
    }
  }
}
