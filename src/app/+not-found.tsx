import { Redirect } from 'expo-router';

// Unknown paths (e.g. the web preview served under a sub-path) go back to the start.
export default function NotFound() {
  return <Redirect href="/" />;
}
