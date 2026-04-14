import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { EvaluationTemplateResponseDto } from '../docs/response-schemas';
import { EvaluationService } from './evaluation.service';

@ApiTags('evaluation-template')
@ApiBearerAuth('Bearer')
@UseGuards(AuthGuard)
@Controller('evaluation-template')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get()
  @ApiOperation({
    summary:     '평가 템플릿 조회 (쿼리)',
    description: '`analysisId` 또는 `sessionId` 중 하나로 평가 템플릿을 조회합니다. 둘 다 없으면 `{ error }` 안내 객체를 반환합니다.',
  })
  @ApiQuery({
    name: 'analysisId', required: false, description: '회사 분석 ID',
  })
  @ApiQuery({
    name: 'sessionId', required: false, description: '면접 세션 ID',
  })
  @ApiOkResponse({
    description: '평가 템플릿', type: EvaluationTemplateResponseDto,
  })
  async findByQuery(@Req() req: Request,
    @Query('analysisId') analysisId?: string,
    @Query('sessionId') sessionId?: string) {
    if (analysisId) {
      return this.evaluationService.findByAnalysisId(analysisId, req.user!.sub);
    }

    if (sessionId) {
      return this.evaluationService.findBySessionId(sessionId, req.user!.sub);
    }

    return { error: 'analysisId 또는 sessionId 파라미터가 필요합니다' };
  }

  @Get(':id')
  @ApiOperation({
    summary:     '평가 템플릿 단건 조회',
    description: '평가 템플릿 ID로 조회합니다. 본인 데이터만 접근 가능합니다.',
  })
  @ApiParam({
    name: 'id', description: 'EvaluationTemplate ID',
  })
  @ApiOkResponse({
    description: '평가 템플릿 레코드', type: EvaluationTemplateResponseDto,
  })
  async findById(@Param('id') id: string, @Req() req: Request) {
    return this.evaluationService.findById(id, req.user!.sub);
  }
}
