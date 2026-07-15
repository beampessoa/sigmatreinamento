// ============================================================
// /api/revisao  —  dados do vídeo + progresso atual
//
// Recebe { token, revisao_id }.
// Resolve a pessoa pelo token, lê a revisão vigente (vw_revisao_vigente)
// e o progresso já acumulado (progresso_video).
// Substitui os db.from(...) diretos que o player fazia por sessão.
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

  // 2. revisão vigente
  const { data: R, error: e2 } = await db
    .from('vw_revisao_vigente')
    .select('*')
    .eq('revisao_id', b.revisao_id)
    .maybeSingle();

  if (e2)          return res.status(500).json({ erro: 'Falha ao ler a revisão' });
  if (!R || !R.youtube_video_id) {
    return res.status(404).json({ erro: 'sem_conteudo' });
  }

  // 3. progresso já acumulado desta pessoa nesta revisão
  const { data: pv } = await db
    .from('progresso_video')
    .select('segmentos, segundos_creditados, concluido')
    .eq('pessoa_id', pid)
    .eq('revisao_id', b.revisao_id)
    .maybeSingle();

  return res.status(200).json({
    revisao: {
      titulo:              R.titulo,
      revisao:             R.revisao,
      procedimento_codigo: R.procedimento_codigo,
      aprovado_por:        R.aprovado_por,
      aprovado_em:         R.aprovado_em,
      youtube_video_id:    R.youtube_video_id,
      duracao_segundos:    R.duracao_segundos
    },
    progresso: pv ? {
      segmentos:  pv.segmentos || [],
      creditado:  pv.segundos_creditados || 0,
      concluido:  pv.concluido || false
    } : { segmentos: [], creditado: 0, concluido: false }
  });
}
