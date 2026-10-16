export interface UserDetailsDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarId?: string;
  registeredAt: Date;
  postsCount: number;
  subscribersCount: number;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
