import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/Loading';
export default function Index() {
  const { user, demo } = useAuth();
  if (user === undefined) return <Loading/>;
  return <Redirect href={user || demo ? '/finance' : '/sign-in'}/>;
}
