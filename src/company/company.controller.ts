import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CompanyRepairResponseDto, CompanyResponseDto, CompanySummaryResponseDto } from '../docs/response-schemas';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@ApiTags('company')
@ApiBearerAuth('Bearer')
@UseGuards(AuthGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiOperation({
    summary:     '회사 생성',
    description: '수동으로 회사 레코드를 생성합니다.',
  })
  @ApiBody({ type: CreateCompanyDto })
  @ApiCreatedResponse({
    description: '생성된 Company 레코드', type: CompanyResponseDto,
  })
  async create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:     '회사 목록 또는 이름 검색',
    description: '`name` 쿼리가 있으면 해당 이름으로 단일 조회, 없으면 전체 목록(최신순)입니다.',
  })
  @ApiQuery({
    name:        'name',
    required:    false,
    description: '지정 시 해당 이름의 회사 1건(없으면 null)',
  })
  @ApiOkResponse({
    description: 'Company[] 또는 단일 Company', type: [CompanyResponseDto],
  })
  async findAll(@Query('name') name?: string) {
    if (name) {
      return this.companyService.findByName(name);
    }

    return this.companyService.findAll();
  }

  @Get(':id/summary')
  @ApiOperation({
    summary:     '회사 요약',
    description: '분석/요약 필드 등 요약 정보를 반환합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Company ID',
  })
  @ApiOkResponse({
    description: '요약 객체', type: CompanySummaryResponseDto,
  })
  async getSummary(@Param('id') id: string) {
    return this.companyService.getSummary(id);
  }

  @Get(':id/repair')
  @ApiOperation({
    summary:     '회사 정보 보정',
    description: '로고 URL 보정 및 에이전트 기반 필드 보강을 시도합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Company ID',
  })
  @ApiOkResponse({
    description: '갱신 후 Company (repaired 플래그 포함)', type: CompanyRepairResponseDto,
  })
  async repair(@Param('id') id: string) {
    return this.companyService.repair(id);
  }

  @Get(':id')
  @ApiOperation({
    summary:     '회사 단건 조회',
    description: 'ID로 Company 레코드를 조회합니다.',
  })
  @ApiParam({
    name: 'id', description: 'Company ID',
  })
  @ApiOkResponse({
    description: 'Company 레코드', type: CompanyResponseDto,
  })
  async findById(@Param('id') id: string) {
    return this.companyService.findById(id);
  }
}
