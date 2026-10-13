import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { RoutineEditor } from '@/components/routine-editor';
import { Button, Kicker, Loading, Screen, Sub, Title } from '@/components/ui';
import { usePlanPreview, useStudentState, useUpdateProfile } from '@/lib/queries';
import { DEFAULT_ROUTINE, Routine } from '@/lib/routine';
import type { Profile } from '@/lib/types';
import { useApp } from '@/store/app';

// Shown on launch to students who haven't told the app about their fixed week yet
// (profiles made before this step joined the onboarding).
export default function Semana() {
  const state = useStudentState();
  if (!state.data) return <Loading error={state.isError} onRetry={() => state.refetch()} />;
  if (!state.data.profile) return <Redirect href="/" />;
  return <WeekPrompt profile={state.data.profile} />;
}

function WeekPrompt({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();
  const [routine, setRoutine] = useState<Routine>(profile.routine ?? DEFAULT_ROUTINE);
  const preview = usePlanPreview({ ...profile, routine });

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
              updateProfile.mutate({ routine });
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
      <RoutineEditor value={routine} onChange={setRoutine} week={profile.week} free={preview.data?.free} />
    </Screen>
  );
}
