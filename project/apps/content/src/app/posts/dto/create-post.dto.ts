import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import { PostType } from '@readme/shared-types';

export class CreatePostBaseDto {
  @ApiProperty({ enum: PostType })
  @IsEnum(PostType)
  type!: PostType;

  @ApiProperty({ required: false, isArray: true, maxItems: 8 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @Matches(/^[a-z][a-z0-9]{2,9}$/i, { each: true })
  tags?: string[];
}

export class CreateVideoPostDto extends CreatePostBaseDto {
  @ApiProperty()
  @IsString()
  @Length(20, 50)
  title!: string;

  @ApiProperty()
  @IsUrl()
  @Matches(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//)
  videoUrl!: string;
}

export class CreateTextPostDto extends CreatePostBaseDto {
  @ApiProperty()
  @IsString()
  @Length(20, 50)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(50, 255)
  announcement!: string;

  @ApiProperty()
  @IsString()
  @Length(100, 1024)
  text!: string;
}

export class CreateQuotePostDto extends CreatePostBaseDto {
  @ApiProperty()
  @IsString()
  @Length(20, 300)
  quoteText!: string;

  @ApiProperty()
  @IsString()
  @Length(3, 50)
  quoteAuthor!: string;
}

export class CreatePhotoPostDto extends CreatePostBaseDto {
  @ApiProperty()
  @IsString()
  photoId!: string;
}

export class CreateLinkPostDto extends CreatePostBaseDto {
  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 300)
  description?: string;
}
