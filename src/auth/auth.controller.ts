import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthTokenResponseDto, MeResponseDto } from '../docs/response-schemas';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary:     '회원가입',
    description: '이메일·비밀번호·이름(필수)으로 계정을 만들고 JWT accessToken을 반환합니다.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'accessToken 및 생성된 사용자', type: AuthTokenResponseDto,
  })
  @Throttle({ default: {
    limit: 15, ttl: 60_000,
  } })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary:     '로그인',
    description: '이메일·비밀번호로 인증 후 JWT accessToken을 반환합니다.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'accessToken 및 사용자', type: AuthTokenResponseDto,
  })
  @Throttle({ default: {
    limit: 30, ttl: 60_000,
  } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiBearerAuth('Bearer')
  @ApiOperation({
    summary:     '현재 사용자',
    description: 'Bearer 토큰으로 로그인한 사용자 프로필을 반환합니다.',
  })
  @ApiOkResponse({
    description: '사용자 id, email, name, createdAt', type: MeResponseDto,
  })
  async me(@Req() req: Request) {
    return this.authService.getMe(req.user!.sub);
  }
}
