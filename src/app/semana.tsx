import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { RoutineEditor } from '@/components/routine-editor';
import { Button, Kicker, Screen, Sub, Title } from '@/components/ui';
import { DEFAULT_ROUTINE, Routine } from '@/lib/routine';
import { useApp } from '@/store/app';

// Shown on launch to students who haven't told the app about their fixed week yet
// (profiles made before this step joined the onboarding).
export default function Semana() {
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const [routine, setRoutine] = useState<Routine>(profile?.routine ?? DEFAULT_ROUTINE);
  if (!profile) return <Redirect href="/" />;

  return (
    <Screen
      footer={
        <>
          <Button
            label="Agora não"
            variant="ghost"
            onPress={() => {
              useApp.setState({ routineSkipped: true });
              router.replace('/hoje');
            }}
          />
          <Button
            label="Salvar minha semana"
            onPress={() => {
              updateProfile({ routine });
              router.replace('/hoje');
            }}
          />
        </>
      }>
      <Kicker>Antes de começar</Kicker>
      <Title>Conte como é a sua semana</Title>
      <Sub>
        Cadastre escola, trabalho, inglês, esporte, hobbies e tudo que se repete. O cronograma usa só os horários livres.
        Você pode mudar isso depois no Perfil.
      </Sub>
      <RoutineEditor value={routine} onChange={setRoutine} week={profile.week} />
    </Screen>
  );
}
