import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlifoCameraAba, GlifoConta, GlifoInicio, GlifoInstalar } from '@/components/arte';
import { useAuth } from '@/contexts/AuthContext';
import { useTema } from '@/contexts/TemaContext';
import { ehAdministrador } from '@/lib/acesso';
import { componentes, corpo, espaco, fontes, raio } from '@/lib/tema';

const icone = (Glifo: (p: { cor: string; tamanho: number }) => ReactNode) =>
  ({ color }: { color: ColorValue }) => <Glifo cor={String(color)} tamanho={componentes.abas.icone} />;

/**
 * Abas por tarefa: Início (o que fazer agora), Instalar (condomínio, poste, câmeras),
 * Câmeras (tudo o que está instalado, por poste) e Conta. No celular, pílula flutuante embaixo;
 * em tela larga de Android, trilho na lateral.
 */
export default function AbasLayout() {
  const { usuario } = useAuth();
  const { cores } = useTema();
  const base = useSafeAreaInsets().bottom;
  const admin = ehAdministrador(usuario?.role);
  // tablet Android: trilho na lateral, como pede o Material. iPhone deitado continua com a barra de abas do iOS
  const largura = useWindowDimensions().width;
  const largo = Platform.OS !== 'ios' && largura >= componentes.abas.larguraDoTrilho;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: cores.fundo },
        tabBarActiveTintColor: cores.azul,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarPosition: largo ? 'left' : 'bottom',
        tabBarVariant: largo ? 'material' : 'uikit',
        tabBarLabelPosition: largo ? 'below-icon' : undefined,
        tabBarStyle: largo
          ? { backgroundColor: cores.flutuante, borderRightColor: cores.vidroBorda, borderRightWidth: 1, width: componentes.abas.larguraDoTrilhoAberto }
          // celular: pílula que flutua acima do fim da tela; as telas deixam `abas.reserva` livre no fim
          : {
            position: 'absolute',
            left: componentes.abas.margem,
            right: componentes.abas.margem,
            bottom: base + componentes.abas.margem,
            height: componentes.abas.altura,
            borderRadius: raio.pilula,
            backgroundColor: cores.flutuante,
            borderTopWidth: 0,
            paddingTop: espaco[1.5],
            paddingBottom: espaco[1.5],
            paddingHorizontal: espaco[1.5],
          },
        // a aba ativa ganha um fundo em pílula (no trilho, o próprio Material desenha o dele)
        tabBarActiveBackgroundColor: largo ? undefined : cores.azulSuave,
        tabBarItemStyle: largo ? undefined : { borderRadius: raio.pilula, overflow: 'hidden' },
        tabBarLabelStyle: { ...fontes.textoForte, fontSize: corpo.micro },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone(GlifoInicio) }} />
      {/* Instalar só existe para quem gerencia câmeras (ver lib/acesso.ts) */}
      <Tabs.Protected guard={admin}>
        <Tabs.Screen name="instalar" options={{ title: 'Instalar', tabBarIcon: icone(GlifoInstalar) }} />
      </Tabs.Protected>
      <Tabs.Screen name="cameras" options={{ title: 'Câmeras', tabBarIcon: icone(GlifoCameraAba) }} />
      <Tabs.Screen name="conta" options={{ title: 'Conta', tabBarIcon: icone(GlifoConta) }} />
    </Tabs>
  );
}
