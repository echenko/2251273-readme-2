import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { PostType, SortType } from '@readme/shared-types';
import { PostsService } from './posts.service';
import { QueryPostsDto } from './dto/query-posts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать публикацию' })
  @ApiResponse({ status: 201, description: 'Публикация создана' })
  @ApiResponse({ status: 400, description: 'Ошибка валидации' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  create(@CurrentUser() user: { sub: string }, @Body() body: any) {
    return this.postsService.create(user.sub, body);
  }

  @Get()
  @ApiOperation({ summary: 'Список публикаций' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Смещение' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Лимит (max 25)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: SortType, description: 'Сортировка' })
  @ApiQuery({ name: 'type', required: false, enum: PostType, description: 'Тип публикации' })
  @ApiQuery({ name: 'tag', required: false, type: String, description: 'Тег' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Поиск по заголовку' })
  list(@Query() query: QueryPostsDto) {
    return this.postsService.list(query);
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
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Поисковый запрос' })
  search(@Query('q') q: string) {
    return this.postsService.list({ search: q, limit: 20 } as QueryPostsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детальная информация о публикации' })
  @ApiParam({ name: 'id', description: 'UUID публикации' })
  @ApiResponse({ status: 200, description: 'Публикация' })
  @ApiResponse({ status: 404, description: 'Не найдена' })
  getById(@Param('id') id: string) {
    return this.postsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Редактировать публикацию' })
  @ApiParam({ name: 'id', description: 'UUID публикации' })
  update(
    @Param('id') id: string,
    @Body() patch: Record<string, unknown>,
    @CurrentUser() user: { sub: string },
  ) {
    return this.postsService.update(user.sub, id, patch as any);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить публикацию' })
  @ApiParam({ name: 'id', description: 'UUID публикации' })
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.postsService.remove(user.sub, id);
  }

  @Post(':id/repost')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Репост публикации' })
  @ApiParam({ name: 'id', description: 'UUID оригинальной публикации' })
  @ApiResponse({ status: 200, description: 'Репост создан' })
  @ApiResponse({ status: 403, description: 'Уже репостили' })
  repost(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.postsService.repost(user.sub, id);
  }
}
