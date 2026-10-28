import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { Mensagem } from '@/components/formulario';
import { Grupo, Linha } from '@/components/lista';
import { SeloSituacao } from '@/components/os/ui';
import { Bloco } from '@/components/ui';
import { ApiError } from '@/lib/os/api';
import { listarOS, ordenarOS, quando } from '@/lib/os/ordens';
import type { OrdemServico } from '@/lib/os/types';

const MAXIMO = 3;

/** O que ainda é para hoje: em atendimento, pausada ou aberta agendada até o fim do dia. */
function paraHoje(lista: OrdemServico[]): OrdemServico[] {
  const fimDeHoje = new Date();
  fimDeHoje.setHours(23, 59, 59, 999);
  return ordenarOS(lista).filter(o => o.situacao === 'andamento' || o.situacao === 'pausada'
    || (o.situacao === 'aberta' && !!o.agendada_para && new Date(o.agendada_para) <= fimDeHoje));
}

/**
 * Bloco do Início com as OS de hoje. Lê pelo mesmo caminho da aba OS (sem sinal, o que está
 * guardado no celular), então funciona no poste sem internet.
 */
export function OSDeHoje() {
  const router = useRouter();
  const [lista, setLista] = useState<OrdemServico[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let vivo = true;
    listarOS()
      .then(r => { if (vivo) { setLista(paraHoje(r.lista)); setErro(null); } })
      .catch(e => { if (vivo) setErro(e instanceof ApiError ? e.message : 'Não deu para carregar as OS.'); });
    return () => { vivo = false; };
  }, []));

  if (lista === null && !erro) return null;
  const hoje = lista ?? [];

  return (
    <Bloco
      titulo={hoje.length ? 'OS de hoje' : 'Nenhuma OS para hoje'}
      acao={hoje.length > MAXIMO ? `Ver todas (${hoje.length})` : 'Ver OS'}
      aoTocar={() => router.navigate('/os')}
    >
      {erro ? <Mensagem texto={erro} tom="erro" /> : hoje.length > 0 && (
        <Grupo>
          {hoje.slice(0, MAXIMO).map((o, i, l) => (
            <Linha
              key={o.id}
              titulo={o.titulo}
              detalhe={`${o.cliente.nome}, ${quando(o.agendada_para)}`}
              abaixo={<SeloSituacao situacao={o.situacao} />}
              onPress={() => router.push({ pathname: '/os/[id]', params: { id: String(o.id) } })}
              ultima={i === l.length - 1}
            />
          ))}
        </Grupo>
      )}
    </Bloco>
  );
}
