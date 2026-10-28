import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_600SemiBold } from '@expo-google-fonts/atkinson-hyperlegible-next/600SemiBold';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { AtkinsonHyperlegibleNext_800ExtraBold } from '@expo-google-fonts/atkinson-hyperlegible-next/800ExtraBold';
import { AtkinsonHyperlegibleMono_500Medium } from '@expo-google-fonts/atkinson-hyperlegible-mono/500Medium';
import { AtkinsonHyperlegibleMono_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-mono/700Bold';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TemaProvider, useTema } from '@/contexts/TemaContext';
import { ehAdministrador } from '@/lib/acesso';
import { registrarAvisos, useAvisoAbreOS } from '@/lib/os/avisos';
import { vigiarConexao } from '@/lib/os/fila';
import { Tela } from '@/components/ui';
import { corpo, fontes } from '@/lib/tema';

function Rotas() {
  const { usuario, carregando, permissoesVistas } = useAuth();
  const { cores } = useTema();
  // primeiro acesso, nesta ordem: criar a senha → aceitar os termos → permissões → o app
  const senhaOk = !!usuario && !usuario.trocarSenha;
  const termosOk = senhaOk && !usuario.termosPendentes;
  const liberado = termosOk && permissoesVistas;
  // liberado: a fila das OS sobe quando a conexão volta e quando o app volta para a tela (sem consultar)
  useEffect(() => { if (liberado) { vigiarConexao(); void registrarAvisos(); } }, [liberado]);
  // tocar no aviso de OS nova abre a OS
  const router = useRouter();
  useAvisoAbreOS(router, liberado);
  // Se a fonte falhar, segue com a do sistema em vez de travar na tela de espera
  const [fontesProntas, erroFontes] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_700Bold,
    AtkinsonHyperlegibleNext_800ExtraBold,
    AtkinsonHyperlegibleMono_500Medium,
    AtkinsonHyperlegibleMono_700Bold,
  });

  if (carregando || (!fontesProntas && !erroFontes)) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={cores.azul} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenLayout={({ children }) => <Tela>{children}</Tela>}
        screenOptions={{
          headerStyle: { backgroundColor: cores.fundo },
          headerTintColor: cores.texto,
          headerTitleStyle: { ...fontes.nome, fontSize: corpo.cabecalho },
          headerShadowVisible: false,
          headerShown: false,   // cada tela desenha o próprio topo (components/ui.tsx)
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        {/* primeiro acesso: até criar a própria senha, esta é a única tela */}
        <Stack.Protected guard={!!usuario && usuario.trocarSenha}>
          <Stack.Screen name="primeira-senha" />
        </Stack.Protected>
        <Stack.Protected guard={senhaOk && !termosOk}>
          <Stack.Screen name="termos" />
        </Stack.Protected>
        <Stack.Protected guard={termosOk && !permissoesVistas}>
          <Stack.Screen name="permissoes" />
        </Stack.Protected>

        <Stack.Protected guard={liberado}>
          <Stack.Screen name="(abas)" options={{ headerShown: false, title: 'Início' }} />
          <Stack.Screen name="os/[id]/index" options={{ title: 'OS' }} />
          <Stack.Screen name="os/[id]/concluir" options={{ title: 'Concluir' }} />
          <Stack.Screen name="local/[id]" options={{ title: 'Local' }} />
          <Stack.Screen name="ler-qr" options={{ title: 'Ler QR' }} />
          <Stack.Screen name="condominio/[id]" options={{ title: 'Condomínio' }} />
          <Stack.Screen name="poste/[id]" options={{ title: 'Poste' }} />
          <Stack.Screen name="camera/[id]" options={{ title: 'Câmera' }} />
        </Stack.Protected>

        {/* Telas de administração e de instalação: só para quem gerencia câmeras */}
        <Stack.Protected guard={liberado && ehAdministrador(usuario?.role)}>
          <Stack.Screen name="instalar/[id]" options={{ title: 'Instalar' }} />
          <Stack.Screen name="admin/condominio/[id]" options={{ title: 'Administrar' }} />
          <Stack.Screen name="admin/poste" options={{ title: 'Poste' }} />
          <Stack.Screen name="admin/camera" options={{ title: 'Câmera' }} />
          <Stack.Screen name="admin/diagnostico" options={{ title: 'Diagnóstico' }} />
        </Stack.Protected>

        <Stack.Protected guard={!usuario}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <TemaProvider>
      <AuthProvider>
        <Rotas />
      </AuthProvider>
    </TemaProvider>
  );
}
