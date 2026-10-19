import { Post, PostStatus, PostType } from '@readme/shared-types';

export type PostEntity = Post;

export function createPostBase(params: {
  id: string;
  type: PostType;
  authorId: string;
  tags: string[];
  status?: PostStatus;
  isRepost?: boolean;
  originalPostId?: string;
  originalAuthorId?: string;
}) {
  const now = new Date();
  return {
    id: params.id,
    type: params.type,
    status: params.status ?? PostStatus.Published,
    authorId: params.authorId,
    tags: params.tags,
    createdAt: now,
    publishedAt: now,
    isRepost: params.isRepost ?? false,
    originalPostId: params.originalPostId,
    originalAuthorId: params.originalAuthorId,
  };
}
