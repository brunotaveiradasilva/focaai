import { useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/components/profile-view';

// Perfil de outro aluno
export default function Usuario() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileView userId={id} />;
}
