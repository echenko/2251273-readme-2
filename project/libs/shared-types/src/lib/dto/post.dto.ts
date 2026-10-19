import { PostType } from '../enums/post-type.enum.js';

export interface CreatePostDtoBase {
  type: PostType;
  tags?: string[];
}

export interface CreateVideoPostDto extends CreatePostDtoBase {
  type: PostType.Video;
  title: string;
  videoUrl: string;
}

export interface CreateTextPostDto extends CreatePostDtoBase {
  type: PostType.Text;
  title: string;
  announcement: string;
  text: string;
}

export interface CreateQuotePostDto extends CreatePostDtoBase {
  type: PostType.Quote;
  quoteText: string;
  quoteAuthor: string;
}

export interface CreatePhotoPostDto extends CreatePostDtoBase {
  type: PostType.Photo;
  photoId: string;
}

export interface CreateLinkPostDto extends CreatePostDtoBase {
  type: PostType.Link;
  url: string;
  description?: string;
}

export type CreatePostDto =
  | CreateVideoPostDto
  | CreateTextPostDto
  | CreateQuotePostDto
  | CreatePhotoPostDto
  | CreateLinkPostDto;

export interface PostListItemDto {
  id: string;
  type: PostType;
  title?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  likesCount: number;
  commentsCount: number;
  publishedAt: Date;
}
