import { LikeEntity } from '../entities/like.entity';

export abstract class LikesRepository {
  abstract findByUserAndPost(userId: string, postId: string): Promise<LikeEntity | null>;
  abstract create(like: LikeEntity): Promise<LikeEntity>;
  abstract delete(id: string): Promise<boolean>;
  abstract countByPost(postId: string): Promise<number>;
  abstract deleteByPost(postId: string): Promise<number>;
}
