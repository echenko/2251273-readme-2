export interface CreateCommentDto {
  text: string;
}

export interface CommentResponseDto {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: Date;
}
