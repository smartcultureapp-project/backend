import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CompanyAnalysisResponseDto } from '../docs/response-schemas';
import { AnalysisService } from './analysis.service';
import { StartAnalysisDto } from './dto/start-analysis.dto';

@ApiTags('analysis')
@ApiBearerAuth('Bearer')
@UseGuards(AuthGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('start')
  @ApiOperation({
    summary:     '회사 딥리서치 시작 (SSE)',
    description: 'Server-Sent Events 스트림으로 진행 상황·완료 이벤트를 전송합니다. 응답 본문은 JSON이 아니라 `text/event-stream` 입니다.',
  })
  @ApiProduces('text/event-stream')
  @ApiBody({ type: StartAnalysisDto })
  @ApiOkResponse({
    description: 'SSE 이벤트 스트림 (진행/완료/에러 등)',
    schema:      {
      type:        'string',
      description: 'event: … / data: … 형식의 SSE 청크',
    },
  })
  async start(@Body() dto: StartAnalysisDto,
    @Req() req: Request,
    @Res() res: Response) {
    await this.analysisService.startAnalysis(dto, req.user!.sub, res);
  }

  @Get(':sessionId')
  @ApiOperation({
    summary:     '분석 결과 조회',
    description: '해당 세션의 회사 분석 결과(딥리서치 결과)를 반환합니다. 본인 세션만 조회 가능합니다.',
  })
  @ApiParam({
    name: 'sessionId', description: '세션 ID', example: 'sess_xxx',
  })
  @ApiOkResponse({
    description: 'CompanyAnalysis 레코드', type: CompanyAnalysisResponseDto,
  })
  async getAnalysis(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.analysisService.getAnalysis(sessionId, req.user!.sub);
  }
}
