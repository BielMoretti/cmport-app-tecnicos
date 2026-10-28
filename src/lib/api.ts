import { cabecalhosDoAparelho, prepararAparelho } from './aparelho';
import { criarCliente } from './cliente';
import { API_URL } from './config';
import { arrumarNomes } from './texto';

export { ApiError } from './cliente';

/**
 * Cliente da API das câmeras (/api/instalador/v1). O token é o do serviço de câmeras, tirado no
 * mesmo login da OS (contexts/AuthContext.tsx).
 */
const cameras = criarCliente({
  base: API_URL,
  // a identidade do aparelho vai em todo pedido: é o que o servidor confere no login preso a um aparelho
  cabecalhos: async () => { await prepararAparelho(); return cabecalhosDoAparelho(); },
  // nomes de condomínio chegam em MAIÚSCULAS; aqui viram texto normal (ver lib/texto.ts)
  tratar: arrumarNomes,
  // o login da OS entrou, mas o das câmeras não (serviço fora do ar naquela hora)
  semToken: 'As câmeras não estão disponíveis nesta sessão. Saia e entre de novo para ver as câmeras.',
});

export const { api, setToken, setAoExpirar, setAoRenovar, renovarSessao } = cameras;
