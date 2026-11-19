import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { SERVICES } from '../common/clients/services';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly http: HttpService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация (proxy → users)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 409 })
  async register(@Body() body: unknown) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${SERVICES.users}/auth/register`, body),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Логин (proxy → users)' })
  async login(@Body() body: unknown) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${SERVICES.users}/auth/login`, body),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh (proxy → users)' })
  async refresh(@Body() body: unknown) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${SERVICES.users}/auth/refresh`, body),
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status ?? 500;
      const message = error?.response?.data ?? { message: 'Internal error' };
      throw new HttpException(message, status);
    }
  }
}
