import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiParam({ name: 'postId', description: 'UUID публикации' })
  @ApiResponse({ status: 201, description: 'Комментарий создан' })
  @ApiResponse({ status: 400, description: 'Ошибка валидации' })
  create(
    @Param('postId') postId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user.sub, postId, dto);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Список комментариев к публикации' })
  @ApiParam({ name: 'postId', description: 'UUID публикации' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'max 50' })
  list(@Param('postId') postId: string, @Query() query: QueryCommentsDto) {
    return this.commentsService.listByPost(postId, query);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить свой комментарий' })
  @ApiParam({ name: 'id', description: 'UUID комментария' })
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.commentsService.remove(user.sub, id);
  }
}
