export interface CommentEntity {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: Date;
}
