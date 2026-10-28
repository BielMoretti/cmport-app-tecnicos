import { criarCliente } from '../cliente';
import { API_OS_URL } from '../config';

export { ApiError } from '../cliente';

/** Cliente da API das ordens de serviço (/api/tecnico/v1), com o token do serviço de OS. */
const ordens = criarCliente({ base: API_OS_URL });

export const { api, enviarArquivo, setToken, setAoExpirar, setAoRenovar, renovarSessao } = ordens;
