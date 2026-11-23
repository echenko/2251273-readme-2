import { Post } from '@readme/shared-types';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SERVICES } from '../common/clients/services';

interface AuthorDto {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

@Injectable()
export class GatewayPostsService {
  private readonly logger = new Logger(GatewayPostsService.name);

  constructor(private readonly http: HttpService) {}

  async listPosts(query: Record<string, unknown>) {
    const { data } = await firstValueFrom(
      this.http.get(`${SERVICES.content}/posts`, { params: query }),
    );

    const enriched = await Promise.all(
      (data.items ?? []).map(async (post: Post) => {
        const [author, likesCount, commentsCount] = await Promise.all([
          this.getAuthor(post.authorId),
          this.getLikesCount(post.id),
          this.getCommentsCount(post.id),
        ]);
        return { ...post, author, likesCount, commentsCount };
      }),
    );

    return { ...data, items: enriched };
  }

  async getPost(id: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${SERVICES.content}/posts/${id}`),
    );

    const [author, likesCount, commentsCount] = await Promise.all([
      this.getAuthor(data.authorId),
      this.getLikesCount(id),
      this.getCommentsCount(id),
    ]);

    return { ...data, author, likesCount, commentsCount };
  }

  private async getAuthor(authorId: string): Promise<AuthorDto> {
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
    } catch (err) {
      this.logger.warn(`Author ${authorId} not found: ${(err as Error).message}`);
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
