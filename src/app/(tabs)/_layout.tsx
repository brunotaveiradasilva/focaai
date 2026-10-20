import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Loading } from '@/components/ui';
import { useStudentState } from '@/lib/queries';
import { colors } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'hoje', title: 'Início', icon: 'home' },
  { name: 'estudar', title: 'Roadmap', icon: 'map' },
  { name: 'questoes', title: 'Questões', icon: 'document-text' },
  { name: 'pessoas', title: 'Pessoas', icon: 'people' },
];

export default function TabsLayout() {
  const state = useStudentState();
  const insets = useSafeAreaInsets();
  // Opened straight on a tab (reload, link): wait for the state instead of bouncing to the start.
  if (!state.data) return <Loading error={state.isError} onRetry={() => state.refetch()} />;
  // No profile yet: the welcome screen sends the student to the onboarding.
  if (!state.data.profile) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        // Icons only; the title still names each tab for screen readers.
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 56 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
        sceneStyle: { backgroundColor: colors.ink },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? t.icon : (`${t.icon}-outline` as IconName)} size={24} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
