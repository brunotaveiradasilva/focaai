import { ProfileView } from '@/components/profile-view';
import { useSession } from '@/store/session';

// Meu perfil na rede (as configurações de estudo ficam em Ajustes)
export default function Perfil() {
  const userId = useSession((s) => s.user!.id);
  return <ProfileView userId={userId} />;
}
