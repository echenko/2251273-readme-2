import { PostType } from '../enums/post-type.enum.js';
import { PostStatus } from '../enums/post-status.enum.js';

export interface PostBase {
  id: string;
  type: PostType;
  status: PostStatus;
  authorId: string;
  tags: string[];
  createdAt: Date;
  publishedAt: Date;
  isRepost: boolean;
  originalPostId?: string;
  originalAuthorId?: string;
}

export interface VideoPost extends PostBase {
  type: PostType.Video;
  title: string;
  videoUrl: string;
}

export interface TextPost extends PostBase {
  type: PostType.Text;
  title: string;
  announcement: string;
  text: string;
}

export interface QuotePost extends PostBase {
  type: PostType.Quote;
  quoteText: string;
  quoteAuthor: string;
}

export interface PhotoPost extends PostBase {
  type: PostType.Photo;
  photoId: string;
}

export interface LinkPost extends PostBase {
  type: PostType.Link;
  url: string;
  description?: string;
}

export type Post = VideoPost | TextPost | QuotePost | PhotoPost | LinkPost;
