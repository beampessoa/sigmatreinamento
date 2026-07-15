// ============================================================
// /api/heartbeat  —  crédito de progresso do vídeo
//
// Recebe { token, revisao_id, de, ate }.
// Resolve a pessoa pelo token e chama sigmatr.registrar_heartbeat,
// que JÁ valida tempo-real contra o relógio do servidor.
//
// O cliente nunca escreve progresso direto: só por aqui.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'sigmatr' }, auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const b = req.body || {};
  const token = (b.token || '').trim();
  if (!token || !b.revisao_id) {
    return res.status(400).json({ erro: 'Requisição incompleta' });
  }

  // 1. token → pessoa_id
  const { data: pid, error: e1 } = await db.rpc('pessoa_por_token', { p_token: token });
  if (e1)  return res.status(500).json({ erro: 'Falha ao validar o acesso' });
  if (!pid) return res.status(401).json({ erro: 'Acesso não reconhecido' });

  // 2. credita (a função faz toda a validação anti-fraude)
  const { data, error } = await db.rpc('registrar_heartbeat', {
    p_pessoa_id: pid,
    p_revisao_id: b.revisao_id,
    p_de:  Math.max(0, parseInt(b.de,  10) || 0),
    p_ate: Math.max(0, parseInt(b.ate, 10) || 0)
  });

  if (error) {
    // Ex.: revisão não vigente, sem duração. Mensagem some do cliente.
    return res.status(422).json({ erro: 'Progresso não pôde ser registrado' });
  }

  // rpc que retorna TABLE vem como array de 1 linha
  const r = Array.isArray(data) ? data[0] : data;

  return res.status(200).json({
    creditado: r.segundos_creditados,
    duracao:   r.duracao_segundos,
    cobertura: r.cobertura,
    concluido: r.concluido,
    aceito:    r.aceito       // false = tempo impossível; o cliente não avisa o usuário
  });
}
