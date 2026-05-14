#!/bin/bash
# 회사 분석 API 테스트
# 서버가 MOCK_ANALYSIS=true 로 실행 중이어야 함
# 터미널1: MOCK_ANALYSIS=true bun run dev
# 터미널2: ./scripts/test-analysis.sh

echo "POST /api/analysis/start"
curl -N -X POST http://localhost:3000/api/analysis/start \
  -H "Content-Type: application/json" \
  -d '{"companyName":"카카오","jobRole":"프론트엔드 개발자","additionalInfo":""}' \
  2>/dev/null | while read -r line; do
  if [[ "$line" == data:* ]]; then
    echo "$line" | sed 's/^data: //'
  fi
done

echo ""
echo "완료. sessionId로 GET /api/analysis/:sessionId 호출하여 결과 확인"
