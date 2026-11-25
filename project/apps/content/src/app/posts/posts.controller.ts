import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { PostType, SortType } from '@readme/shared-types';
import { PostsService } from './posts.service';
import { QueryPostsDto } from './dto/query-posts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePostBaseDto } from './dto/create-post.dto';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать публикацию' })
  create(@CurrentUser() user: { sub: string }, @Body() body: Record<string, unknown>) {
    return this.postsService.create(user.sub, body);
  }

  @Get()
  @ApiOperation({ summary: 'Список публикаций' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: SortType })
  @ApiQuery({ name: 'type', required: false, enum: PostType })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'authorId', required: false, type: String })
  @ApiQuery({ name: 'authorIds', required: false, type: String, description: 'Через запятую' })
  list(@Query() query: QueryPostsDto) {
    return this.postsService.list(query);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Лента по списку авторов' })
  @ApiQuery({ name: 'authorIds', required: true, type: String, description: 'Через запятую' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: SortType })
  feed(@Query() query: QueryPostsDto) {
    return this.postsService.feed(query);
  }

  @Get('drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои черновики' })
  drafts(@CurrentUser() user: { sub: string }) {
    return this.postsService.drafts(user.sub);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск публикаций' })
  @ApiQuery({ name: 'q', required: true, type: String })
  search(@Query('q') q: string) {
    return this.postsService.list({ search: q, limit: 20 } as QueryPostsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детальная информация' })
  @ApiParam({ name: 'id', description: 'UUID' })
  getById(@Param('id') id: string) {
    return this.postsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Редактировать' })
  update(
    @Param('id') id: string,
    @Body() patch: Record<string, unknown>,
    @CurrentUser() user: { sub: string },
  ) {
    return this.postsService.update(user.sub, id, patch as Partial<CreatePostBaseDto>);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить' })
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.postsService.remove(user.sub, id);
  }

  @Post(':id/repost')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Репост' })
  repost(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.postsService.repost(user.sub, id);
  }
}
