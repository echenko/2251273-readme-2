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
import {
  PostType,
  POST_TITLE_MIN_LENGTH,
  POST_TITLE_MAX_LENGTH,
  POST_ANNOUNCEMENT_MIN_LENGTH,
  POST_ANNOUNCEMENT_MAX_LENGTH,
  POST_TEXT_MIN_LENGTH,
  POST_TEXT_MAX_LENGTH,
  QUOTE_TEXT_MIN_LENGTH,
  QUOTE_TEXT_MAX_LENGTH,
  QUOTE_AUTHOR_MIN_LENGTH,
  QUOTE_AUTHOR_MAX_LENGTH,
  LINK_DESCRIPTION_MIN_LENGTH,
  LINK_DESCRIPTION_MAX_LENGTH,
  TAG_MAX_COUNT,
  TAG_PATTERN,
  YOUTUBE_URL_PATTERN,
} from '@readme/shared-types';

export class CreatePostBaseDto {
  @ApiProperty({ enum: PostType })
  @IsEnum(PostType)
  type!: PostType;

  @ApiProperty({ required: false, isArray: true, maxItems: TAG_MAX_COUNT })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TAG_MAX_COUNT)
  @Matches(TAG_PATTERN, { each: true })
  tags?: string[];
}

export class CreateVideoPostDto extends CreatePostBaseDto {
  @ApiProperty()
  @IsString()
  @Length(POST_TITLE_MIN_LENGTH, POST_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty()
  @IsUrl()
  @Matches(YOUTUBE_URL_PATTERN)
  videoUrl!: string;
}

export class CreateTextPostDto extends CreatePostBaseDto {
  @ApiProperty()
  @IsString()
  @Length(POST_TITLE_MIN_LENGTH, POST_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(POST_ANNOUNCEMENT_MIN_LENGTH, POST_ANNOUNCEMENT_MAX_LENGTH)
  announcement!: string;

  @ApiProperty()
  @IsString()
  @Length(POST_TEXT_MIN_LENGTH, POST_TEXT_MAX_LENGTH)
  text!: string;
}

export class CreateQuotePostDto extends CreatePostBaseDto {
  @ApiProperty()
  @IsString()
  @Length(QUOTE_TEXT_MIN_LENGTH, QUOTE_TEXT_MAX_LENGTH)
  quoteText!: string;

  @ApiProperty()
  @IsString()
  @Length(QUOTE_AUTHOR_MIN_LENGTH, QUOTE_AUTHOR_MAX_LENGTH)
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
  @Length(LINK_DESCRIPTION_MIN_LENGTH, LINK_DESCRIPTION_MAX_LENGTH)
  description?: string;
}
