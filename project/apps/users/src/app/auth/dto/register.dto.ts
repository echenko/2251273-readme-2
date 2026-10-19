import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Length(3, 50)
  firstName: string;

  @ApiProperty()
  @IsString()
  @Length(3, 50)
  lastName: string;

  @ApiProperty()
  @IsString()
  @Length(6, 12)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarId?: string;
}
