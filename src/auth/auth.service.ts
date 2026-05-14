import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService,
    private readonly jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({ data: {
      email: dto.email,
      name:  dto.name,
      passwordHash,
    } });

    this.logger.log(`회원가입: ${user.email} (${user.id})`);

    const token = await this.signToken(user.id, user.email);

    return {
      accessToken: token,
      user:        {
        id: user.id, email: user.email, name: user.name,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다');
    }

    this.logger.log(`로그인: ${user.email} (${user.id})`);

    const token = await this.signToken(user.id, user.email);

    return {
      accessToken: token,
      user:        {
        id: user.id, email: user.email, name: user.name,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    return {
      id: user.id, email: user.email, name: user.name, createdAt: user.createdAt,
    };
  }

  private signToken(userId: string, email: string): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId, email,
    });
  }
}
