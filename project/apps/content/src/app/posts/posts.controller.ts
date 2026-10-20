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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DEFAULT_SEARCH_LIMIT } from '@readme/shared-types';
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
  create(@CurrentUser() user: { sub: string }, @Body() body: any) {
    return this.postsService.create(user.sub, body);
  }

  @Get()
  @ApiOperation({ summary: 'Список публикаций' })
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
  @ApiOperation({ summary: 'Поиск' })
  search(@Query('q') q: string) {
    return this.postsService.list({ search: q, limit: DEFAULT_SEARCH_LIMIT } as QueryPostsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детальная информация' })
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
    return this.postsService.update(user.sub, id, patch as any);
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
