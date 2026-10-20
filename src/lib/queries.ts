// Every screen reads the API through these hooks. Mutations refresh what they change: a check-in,
// for example, moves the week, the roadmap and the stats.
import { QueryClient, keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { Area, SubjectId } from '@/data/catalog';
import { api } from '@/lib/api';
import { importLegacyState } from '@/lib/legacy';
import type {
  CheckinResult,
  Comment,
  Friends,
  Member,
  PeopleScreen,
  PlanPreview,
  PlanSummary,
  Post,
  PostPage,
  Profile,
  PublicProfile,
  Simulado,
  SimuladoSummary,
  Stats,
  StudentRoadmap,
  StudentState,
  Week,
} from '@/lib/types';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const keys = {
  state: ['estado'] as const,
  week: ['semana'] as const,
  plan: ['plano'] as const,
  stats: (days: number) => ['estatisticas', days] as const,
  roadmap: (subject: SubjectId) => ['roteiro', subject] as const,
  simulados: ['simulados'] as const,
  active: ['simulado-em-andamento'] as const,
  simulado: (id: string) => ['simulado', id] as const,
  people: ['pessoas'] as const,
  preview: (profile: Profile) => ['previa', JSON.stringify({ ...profile, createdAt: '' })] as const,
  profileOf: (id: string) => ['usuario', id] as const,
  postsOf: (id: string) => ['posts-de', id] as const,
  feed: ['feed'] as const,
  post: (id: number) => ['post', id] as const,
  friends: ['amigos'] as const,
  search: (text: string) => ['busca', text] as const,
};

/** Everything that depends on the student's study data (all but the state itself). */
function refreshStudy() {
  for (const key of [keys.week, keys.plan, ['estatisticas'], ['roteiro'], keys.people]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

// ---------------------------------------------------------------------------
// State and profile
// ---------------------------------------------------------------------------

/** Profile, progress, focus and recent adjustments. The first time, brings the device's old data over. */
export function useStudentState() {
  return useQuery({
    queryKey: keys.state,
    queryFn: async () => {
      const state = await api<StudentState>('/api/eu/estado');
      if (state.profile) return state;
      return (await importLegacyState()) ?? state;
    },
  });
}

/** Screens past onboarding: the profile is there (the routes guarantee it). */
export function useProfile() {
  return useStudentState().data?.profile ?? null;
}

const setState = (state: StudentState) => queryClient.setQueryData(keys.state, state);

export function useSaveProfile() {
  return useMutation({
    mutationFn: (profile: Profile) => api<StudentState>('/api/eu/perfil', { method: 'PUT', body: profile }),
    onSuccess: (state) => {
      setState(state);
      refreshStudy();
    },
  });
}

/** Shows the change right away; the API's answer (or a refetch, if it fails) settles it. */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (changes: Partial<Profile>) => api<StudentState>('/api/eu/perfil', { method: 'PATCH', body: changes }),
    onMutate: (changes) => {
      queryClient.setQueryData<StudentState>(keys.state, (s) =>
        s?.profile ? { ...s, profile: { ...s.profile, ...changes } } : s,
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey: keys.state }),
    onSuccess: (state) => {
      setState(state);
      refreshStudy();
    },
  });
}

/** "Apagar meus dados": the account stays, the study starts over. */
export function useResetStudy() {
  return useMutation({
    mutationFn: () => api('/api/eu/dados', { method: 'DELETE' }),
    onSuccess: () => queryClient.clear(),
  });
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export function useWeek() {
  return useQuery({ queryKey: keys.week, queryFn: () => api<Week>('/api/eu/semana') });
}

export function usePlanSummary() {
  return useQuery({ queryKey: keys.plan, queryFn: () => api<PlanSummary>('/api/eu/plano') });
}

export function useDismissTask() {
  return useMutation({
    mutationFn: (taskId: string) => api(`/api/eu/tarefas/${encodeURIComponent(taskId)}/dispensar`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.week }),
  });
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** The plan a profile not saved yet would get (onboarding, routine editor). Waits for edits to settle. */
export function usePlanPreview(profile: Profile | null) {
  const settled = useDebounced(profile, 300);
  return useQuery({
    queryKey: settled ? keys.preview(settled) : ['previa', null],
    queryFn: () => api<PlanPreview>('/api/plano/previa', { method: 'POST', body: { profile: settled } }),
    enabled: !!settled,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Roadmap and check-ins
// ---------------------------------------------------------------------------

export function useRoadmap(subject: SubjectId) {
  return useQuery({
    queryKey: keys.roadmap(subject),
    queryFn: () => api<StudentRoadmap>(`/api/eu/roteiros/${subject}`),
    placeholderData: keepPreviousData,
  });
}

export function useSetTopicDone() {
  return useMutation({
    mutationFn: ({ topicId, done }: { topicId: string; done: boolean }) =>
      api<StudentState>(`/api/eu/progresso/${encodeURIComponent(topicId)}`, { method: 'PUT', body: { done } }),
    onSuccess: (state) => {
      setState(state);
      refreshStudy();
    },
  });
}

export function useSetFocus() {
  return useMutation({
    mutationFn: ({ subject, topicId }: { subject: SubjectId; topicId: string | null }) =>
      topicId
        ? api<StudentState>(`/api/eu/foco/${subject}`, { method: 'PUT', body: { topicId } })
        : api<StudentState>(`/api/eu/foco/${subject}`, { method: 'DELETE' }),
    onSuccess: (state) => {
      setState(state);
      refreshStudy();
    },
  });
}

export type NewCheckin = {
  at: string;
  taskId?: string;
  subject?: SubjectId;
  topicId?: string;
  activity: string;
  minutes: number;
  feeling: 1 | 2 | 3;
  questions: number;
  correct: number;
};

export function useLogCheckin() {
  return useMutation({
    mutationFn: (c: NewCheckin) => api<CheckinResult>('/api/eu/checkins', { method: 'POST', body: c }),
    onSuccess: (result) => {
      setState(result.state);
      refreshStudy();
    },
  });
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function useStats(days: 7 | 30 = 7) {
  return useQuery({
    queryKey: keys.stats(days),
    queryFn: () => api<Stats>(`/api/eu/estatisticas?dias=${days}`),
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------------------
// Simulados
// ---------------------------------------------------------------------------

export function useSimulados() {
  return useQuery({ queryKey: keys.simulados, queryFn: () => api<SimuladoSummary[]>('/api/eu/simulados') });
}

/** The simulado in progress, or null. */
export function useActiveSimulado() {
  return useQuery({
    queryKey: keys.active,
    queryFn: async () => (await api<Simulado | undefined>('/api/eu/simulados/em-andamento')) ?? null,
  });
}

export function useSimulado(id: string) {
  return useQuery({ queryKey: keys.simulado(id), queryFn: () => api<Simulado>(`/api/eu/simulados/${id}`) });
}

export function useStartSimulado() {
  return useMutation({
    mutationFn: (config: { areas: Area[]; count: number; range: 'recentes' | 'todos' }) =>
      api<Simulado>('/api/eu/simulados', { method: 'POST', body: config }),
    onSuccess: (sim) => queryClient.setQueryData(keys.active, sim),
  });
}

/** Marks the answer right away on screen; the API call follows in the background. */
export function useAnswer() {
  return useMutation({
    mutationFn: ({ key, letter }: { key: string; letter: string }) =>
      api(`/api/eu/simulados/em-andamento/respostas/${encodeURIComponent(key)}`, { method: 'PUT', body: { letter } }),
    onMutate: ({ key, letter }) => {
      queryClient.setQueryData<Simulado | null>(keys.active, (sim) =>
        sim ? { ...sim, answers: { ...sim.answers, [key]: letter } } : sim,
      );
    },
  });
}

export function saveSimuladoTime(seconds: number) {
  queryClient.setQueryData<Simulado | null>(keys.active, (sim) => (sim ? { ...sim, seconds } : sim));
  return api('/api/eu/simulados/em-andamento/tempo', { method: 'PUT', body: { seconds } }).catch(() => {});
}

export function useFinishSimulado() {
  return useMutation({
    mutationFn: () => api<Simulado>('/api/eu/simulados/em-andamento/finalizar', { method: 'POST' }),
    onSuccess: (sim) => {
      queryClient.setQueryData(keys.simulado(sim.id), sim);
      queryClient.setQueryData(keys.active, null);
      queryClient.invalidateQueries({ queryKey: keys.simulados });
      refreshStudy();
    },
  });
}

export function useDiscardSimulado() {
  return useMutation({
    mutationFn: () => api('/api/eu/simulados/em-andamento', { method: 'DELETE' }),
    onSuccess: () => queryClient.setQueryData(keys.active, null),
  });
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export function usePeople() {
  return useQuery({ queryKey: keys.people, queryFn: () => api<PeopleScreen>('/api/eu/pessoas') });
}

export function useToggleGroup() {
  return useMutation({
    mutationFn: ({ groupId, join }: { groupId: string; join: boolean }) =>
      api(`/api/eu/grupos/${encodeURIComponent(groupId)}`, { method: join ? 'PUT' : 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.people }),
  });
}

// ---------------------------------------------------------------------------
// Rede: perfis, amizades, posts e comentários
// ---------------------------------------------------------------------------

/** Anyone's profile, as the signed-in student sees it (with the friendship between them). */
export function usePublicProfile(userId: string) {
  return useQuery({ queryKey: keys.profileOf(userId), queryFn: () => api<PublicProfile>(`/api/usuarios/${userId}`) });
}

const postPages = (path: string) => ({
  queryFn: ({ pageParam }: { pageParam: number | null }) => api<PostPage>(pageParam ? `${path}?antes=${pageParam}` : path),
  initialPageParam: null as number | null,
  getNextPageParam: (last: PostPage) => last.next,
});

/** The student's and their friends' posts, newest first, a page at a time. */
export function useFeed() {
  return useInfiniteQuery({ queryKey: keys.feed, ...postPages('/api/eu/feed') });
}

/** Only the student and their friends see someone's posts: ask only when allowed. */
export function useUserPosts(userId: string, enabled: boolean) {
  return useInfiniteQuery({ queryKey: keys.postsOf(userId), enabled, ...postPages(`/api/usuarios/${userId}/posts`) });
}

export function usePost(id: number) {
  return useQuery({ queryKey: keys.post(id), queryFn: () => api<{ post: Post; comments: Comment[] }>(`/api/posts/${id}`) });
}

export function useFriends() {
  return useQuery({ queryKey: keys.friends, queryFn: () => api<Friends>('/api/eu/amigos') });
}

/** Students by name. Waits for typing to settle and for at least 2 letters. */
export function useSearchStudents(text: string) {
  const settled = useDebounced(text.trim(), 300);
  return useQuery({
    queryKey: keys.search(settled),
    queryFn: () => api<{ user: Member; friendship: PublicProfile['friendship'] }[]>(`/api/usuarios?busca=${encodeURIComponent(settled)}`),
    enabled: settled.length >= 2,
    placeholderData: keepPreviousData,
  });
}

/** A friendship changes counts, lists and whose posts show up: refresh all of the network. */
function refreshNetwork() {
  for (const key of [['usuario'], keys.feed, keys.friends, ['busca']]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
  // Refetched only once the refreshed profile says they can still be seen (unfriending would get a 403).
  queryClient.invalidateQueries({ queryKey: ['posts-de'], refetchType: 'none' });
}

/** `add` asks (or accepts a request already received); `remove` unfriends, cancels or declines. */
export function useFriendship() {
  return useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: 'add' | 'remove' }) =>
      api(`/api/eu/amigos/${userId}`, { method: action === 'add' ? 'PUT' : 'DELETE' }),
    onSuccess: refreshNetwork,
  });
}

export function useSetBio() {
  return useMutation({
    mutationFn: (bio: string) => api<PublicProfile>('/api/eu/bio', { method: 'PUT', body: { bio } }),
    onSuccess: (profile) => queryClient.setQueryData(keys.profileOf(profile.user.id), profile),
  });
}

/** Refreshes the lists and the counts a new or deleted post changes. */
function refreshPosts() {
  for (const key of [keys.feed, ['posts-de'], ['usuario']]) queryClient.invalidateQueries({ queryKey: key });
}

export function useCreatePost() {
  return useMutation({
    mutationFn: (text: string) => api<Post>('/api/posts', { method: 'POST', body: { text } }),
    onSuccess: refreshPosts,
  });
}

export function useDeletePost() {
  return useMutation({
    mutationFn: (id: number) => api(`/api/posts/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: keys.post(id) });
      refreshPosts();
    },
  });
}

export function useComment(postId: number) {
  return useMutation({
    mutationFn: (text: string) => api<Comment>(`/api/posts/${postId}/comentarios`, { method: 'POST', body: { text } }),
    onSuccess: (comment) => {
      queryClient.setQueryData<{ post: Post; comments: Comment[] }>(keys.post(postId), (open) =>
        open ? { post: { ...open.post, comments: open.post.comments + 1 }, comments: [...open.comments, comment] } : open,
      );
      // Comment counts on the cards.
      queryClient.invalidateQueries({ queryKey: keys.feed });
      queryClient.invalidateQueries({ queryKey: ['posts-de'] });
    },
  });
}

export function useDeleteComment(postId: number) {
  return useMutation({
    mutationFn: (commentId: number) => api(`/api/posts/${postId}/comentarios/${commentId}`, { method: 'DELETE' }),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData<{ post: Post; comments: Comment[] }>(keys.post(postId), (open) =>
        open
          ? { post: { ...open.post, comments: open.post.comments - 1 }, comments: open.comments.filter((c) => c.id !== commentId) }
          : open,
      );
      queryClient.invalidateQueries({ queryKey: keys.feed });
      queryClient.invalidateQueries({ queryKey: ['posts-de'] });
    },
  });
}
