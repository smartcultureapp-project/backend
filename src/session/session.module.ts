import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MockInterviewService } from './mock-interview.service';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports:     [PrismaModule, AuthModule],
  controllers: [SessionController],
  providers:   [SessionService, MockInterviewService],
  exports:     [SessionService],
})
export class SessionModule {}
