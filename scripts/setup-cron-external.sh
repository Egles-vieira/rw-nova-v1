// ==========================================
// 4. CRON JOBS AUTOMÁTICOS
// ==========================================
// backend/scripts/setup-cron-external.sh

#!/bin/bash
# Script para configurar cron jobs das APIs externas

# Obter diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Criar cron jobs
cat << EOF > /tmp/roadrw-external-cron
# Road-RW External APIs - Manutenção automática
# Executar manutenção diária às 2h
0 2 * * * cd $PROJECT_DIR && npm run maintenance:external

# Limpeza de logs semanalmente
0 3 * * 0 cd $PROJECT_DIR && node scripts/maintenance-external-apis.js

# Verificação de saúde a cada 15 minutos
*/15 * * * * cd $PROJECT_DIR && curl -s http://localhost:3001/api/external/health | grep -q '"success":true' || echo "API Externa com problema" | mail -s "Road-RW Alert" admin@empresa.com

# Relatório de estatísticas semanal
0 8 * * 1 cd $PROJECT_DIR && npm run external:stats 7 | mail -s "Road-RW Weekly Stats" admin@empresa.com
EOF

# Instalar cron jobs
crontab /tmp/roadrw-external-cron
rm /tmp/roadrw-external-cron

echo "Cron jobs das APIs externas configurados com sucesso!"
crontab -l | grep roadrw