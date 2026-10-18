import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('likes')
@Controller('posts/:postId/likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Поставить лайк' })
  like(@Param('postId') postId: string, @CurrentUser() user: { sub: string }) {
    return this.likesService.like(user.sub, postId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Убрать лайк' })
  unlike(@Param('postId') postId: string, @CurrentUser() user: { sub: string }) {
    return this.likesService.unlike(user.sub, postId);
  }

  @Get()
  @ApiOperation({ summary: 'Количество лайков' })
  count(@Param('postId') postId: string) {
    return this.likesService.count(postId);
  }
}
