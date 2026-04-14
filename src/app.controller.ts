import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary:     '헬스 체크',
    description: '루트 경로(`GET /api`) 문자열 응답으로 서버 동작을 확인합니다.',
  })
  @ApiOkResponse({
    description: 'plain text',
    schema:      {
      type: 'string', example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
