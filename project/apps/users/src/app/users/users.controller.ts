import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои подписки' })
  mySubscriptions(@CurrentUser() user: { sub: string }) {
    return this.usersService.getSubscriptions(user.sub);
  }

  @Get('me/feed-author-ids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ID авторов для моей ленты (я + подписки)' })
  myFeedAuthorIds(@CurrentUser() user: { sub: string }) {
    return this.usersService.getFeedAuthorIds(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детальная информация о пользователе' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Невалидный ObjectId' })
  @ApiResponse({ status: 404, description: 'Не найден' })
  getUser(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.getDetails(id);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Смена пароля текущего пользователя' })
  changePassword(
    @CurrentUser() user: { sub: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.sub, dto);
  }

  @Post(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подписаться на пользователя' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  subscribe(
    @Param('id', ParseObjectIdPipe) followingId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.usersService.subscribe(user.sub, followingId);
  }

  @Delete(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отписаться от пользователя' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  unsubscribe(
    @Param('id', ParseObjectIdPipe) followingId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.usersService.unsubscribe(user.sub, followingId);
  }

  @Get(':id/subscribers')
  @ApiOperation({ summary: 'Список подписчиков' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  getSubscribers(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.getSubscribers(id);
  }

  @Get(':id/subscriptions')
  @ApiOperation({ summary: 'Список подписок' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  getSubscriptions(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.getSubscriptions(id);
  }
}
