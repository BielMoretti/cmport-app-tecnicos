import test from 'node:test';
import assert from 'node:assert/strict';
import { bateComBusca, normalizar } from '../src/lib/os/busca.ts';
import { distanciaM, assinaturaValeAinda, VALIDADE_DA_ASSINATURA_MS } from '../src/lib/os/distancia.ts';

const os = { numero: 'OS-0042', titulo: 'Trocar conector', cliente: { id: 1, nome: 'Condomínio São José' }, endereco: 'Rua das Flores, 10' } as never;

test('normalizar tira acento e caixa', () => assert.equal(normalizar('  São JOSÉ '), 'sao jose'));
test('busca vazia aceita tudo', () => assert.equal(bateComBusca(os, '  '), true));
test('busca sem acento acha cliente', () => assert.equal(bateComBusca(os, 'sao jose'), true));
test('todas as palavras precisam bater', () => assert.equal(bateComBusca(os, 'conector flores'), true));
test('palavra ausente recusa', () => assert.equal(bateComBusca(os, 'conector paulista'), false));
test('acha pelo número', () => assert.equal(bateComBusca(os, '0042'), true));

test('distanciaM: mesmo ponto = 0', () => assert.equal(distanciaM({ lat: -23, lng: -46 }, { lat: -23, lng: -46 }), 0));
test('distanciaM: 1 grau de latitude ~111 km', () => {
  const d = distanciaM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(d > 110_000 && d < 112_000);
});
test('assinatura sem marcação não vale', () => assert.equal(assinaturaValeAinda({} as never, null), false));
test('assinatura vale dentro de 30 min e não depois', () => {
  const agora = Date.now();
  const m = { em: new Date(agora - 10 * 60_000).toISOString() } as never;
  const velha = { em: new Date(agora - VALIDADE_DA_ASSINATURA_MS - 1000).toISOString() } as never;
  assert.equal(assinaturaValeAinda({} as never, m, agora), true);
  assert.equal(assinaturaValeAinda({} as never, velha, agora), false);
});
test('OS liberada pelo escritório ignora o tempo', () => {
  const velha = { em: '2020-01-01T00:00:00Z' } as never;
  assert.equal(assinaturaValeAinda({ liberada_longe: true } as never, velha), true);
});
