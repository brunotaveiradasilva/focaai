import { useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/components/profile-view';
import { useSession } from '@/store/session';

// Meu perfil na rede, com a aba Evolução (as configurações de estudo ficam em Ajustes)
export default function Perfil() {
  const userId = useSession((s) => s.user!.id);
  // ?aba=evolucao opens straight on the stats (from a simulado's result).
  const { aba } = useLocalSearchParams<{ aba?: string }>();
  return <ProfileView userId={userId} initialTab={aba === 'evolucao' ? 'evolucao' : 'posts'} />;
}
