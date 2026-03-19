import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { AnalysisModule } from './analysis/analysis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompanyModule } from './company/company.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    CompanyModule,
    EvaluationModule,
    AnalysisModule,
  ],
  controllers: [AppController],
  providers:   [
    AppService,
    {
      provide: APP_PIPE, useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
