import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { AnalysisModule } from './analysis/analysis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResumeModule } from './resume/resume.module';
import { SessionModule } from './session/session.module';
import { SttModule } from './stt/stt.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [
      {
        name:  'default',
        ttl:   60_000,
        limit: 200,
      },
    ] }),
    LoggerModule.forRoot({ pinoHttp: {
      level:       process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      autoLogging: false,
      serializers: {
        req: req => ({
          method: req.method, url: req.url,
        }),
        res: () => undefined,
      },
      transport: process.env.NODE_ENV !== 'production'
        ? {
          target: 'pino-pretty', options: { colorize: true },
        }
        : undefined,
    } }),
    PrismaModule,
    AuthModule,
    CompanyModule,
    EvaluationModule,
    AnalysisModule,
    SessionModule,
    ResumeModule,
    SttModule,
  ],
  controllers: [AppController],
  providers:   [
    AppService,
    {
      provide: APP_GUARD, useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE, useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
