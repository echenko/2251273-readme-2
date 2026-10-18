import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать комментарий' })
  create(
    @Param('postId') postId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user.sub, postId, dto);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Список комментариев' })
  list(@Param('postId') postId: string, @Query() query: QueryCommentsDto) {
    return this.commentsService.listByPost(postId, query);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить свой комментарий' })
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.commentsService.remove(user.sub, id);
  }
}
