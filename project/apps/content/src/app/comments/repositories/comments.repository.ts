import { CommentEntity } from '../entities/comment.entity';

export abstract class CommentsRepository {
  abstract create(comment: CommentEntity): Promise<CommentEntity>;
  abstract findById(id: string): Promise<CommentEntity | null>;
  abstract findByPost(postId: string, offset: number, limit: number): Promise<CommentEntity[]>;
  abstract countByPost(postId: string): Promise<number>;
  abstract delete(id: string): Promise<boolean>;
  abstract deleteByPost(postId: string): Promise<number>;
}
