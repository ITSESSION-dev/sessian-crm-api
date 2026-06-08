const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../config/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const scoreLead = async (leadId, tenantId) => {
  const result = await query(
    `SELECT l.title, l.amount, l.currency, l.source, l.notes, l.pipeline_stage,
            c.first_name, c.last_name, c.company_name, c.email, c.phone
     FROM leads l
     LEFT JOIN contacts c ON c.id = l.contact_id
     WHERE l.id = $1 AND l.tenant_id = $2`,
    [leadId, tenantId]
  );

  if (result.rows.length === 0) throw new Error('Lead no encontrado');
  const lead = result.rows[0];

  const titulo = lead.title || 'Sin titulo';
  const empresa = lead.company_name || 'No especificada';
  const contacto = ((lead.first_name || '') + ' ' + (lead.last_name || '')).trim() || 'No especificado';
  const email = lead.email || 'No especificado';
  const telefono = lead.phone || 'No especificado';
  const valor = lead.amount ? (lead.currency + ' ' + lead.amount) : 'No especificado';
  const etapa = lead.pipeline_stage || 'new';
  const fuente = lead.source || 'No especificada';
  const notas = lead.notes || 'Sin notas';

  const prompt = [
    'Sos un experto en ventas B2B para empresas de tecnologia en Argentina.',
    'Analiza este lead y asignale un puntaje de 0 a 100 segun su potencial de cierre.',
    '',
    'DATOS DEL LEAD:',
    '- Titulo: ' + titulo,
    '- Empresa: ' + empresa,
    '- Contacto: ' + contacto,
    '- Email: ' + email,
    '- Telefono: ' + telefono,
    '- Valor estimado: ' + valor,
    '- Etapa actual: ' + etapa,
    '- Fuente: ' + fuente,
    '- Notas: ' + notas,
    '',
    'Responde UNICAMENTE con un JSON valido con este formato exacto:',
    '{"score": <numero entre 0 y 100>, "temperature": "<hot|warm|cold>", "reason": "<explicacion breve en espanol de maximo 150 caracteres>"}',
    '',
    'Criterios:',
    '- hot (70-100): datos completos, valor alto, empresa conocida, etapa avanzada',
    '- warm (40-69): datos parciales, valor medio, interes demostrado',
    '- cold (0-39): datos incompletos, sin valor, etapa inicial, sin contexto'
  ].join('\n');

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Respuesta invalida de la IA');
  const scoring = JSON.parse(jsonMatch[0]);

  const score = Math.min(100, Math.max(0, parseInt(scoring.score) || 0));
  const temperature = ['hot','warm','cold'].includes(scoring.temperature) ? scoring.temperature : 'cold';
  const reason = (scoring.reason || '').substring(0, 255);

  await query(
    `UPDATE leads SET ai_score=$1, ai_temperature=$2, ai_score_reason=$3, ai_scored_at=NOW()
     WHERE id=$4 AND tenant_id=$5`,
    [score, temperature, reason, leadId, tenantId]
  );

  try {
    await query(
      `INSERT INTO ai_scoring_logs (tenant_id, lead_id, score, temperature, reason, model_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, leadId, score, temperature, reason, process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001']
    );
  } catch(e) {
    console.log('ai_scoring_logs insert skipped:', e.message);
  }

  return { score, temperature, reason };
};

module.exports = { scoreLead };
