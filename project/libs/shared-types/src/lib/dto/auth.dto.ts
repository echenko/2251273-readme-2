export interface RegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  avatarId?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  accessToken: string;
}
