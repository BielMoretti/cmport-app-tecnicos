import test from 'node:test';
import assert from 'node:assert/strict';
import { passouDoTempo } from '../src/lib/tempoDeBloqueio.ts';

test('menos de 1 min fora: não bloqueia', () => assert.equal(passouDoTempo(0, 59_000), false));
test('1 min ou mais fora: bloqueia', () => assert.equal(passouDoTempo(0, 60_000), true));
