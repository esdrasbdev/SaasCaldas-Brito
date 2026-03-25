/*
 * Job Agendado (Cron) - Monitoramento Automático
 * Executa a busca de publicações (Judit) periodicamente.
 */

const cron = require('node-cron');
const EscavadorService = require('./escavador');

function iniciarJob() {
  // Cronograma: Executa às 06:00, 12:00 e 18:00 todos os dias
  // Formato Cron: Minuto Hora DiaMes Mes DiaSemana
  const horario = '0 6,12,18 * * *'; 
  // Para testes (rodar a cada minuto), use: '* * * * *'

  console.log(`⏰ Agendador de tarefas iniciado. Monitorando Judit em: ${horario}`);

  cron.schedule(horario, async () => {
    console.log('🤖 [JOB AUTOMÁTICO] Iniciando sincronização com Judit...');
    const resultado = await EscavadorService.buscarPublicacoes();
    console.log('🤖 [JOB AUTOMÁTICO] Finalizado.', resultado);
  });
}

module.exports = iniciarJob;