import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

const withAuth = (WrappedComponent: React.ComponentType) => {
  const Wrapper = (props: any) => {
    const router = useRouter();
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    useEffect(() => {
      const token = sessionStorage.getItem('admin-auth-token');
      if (!token || isTokenExpired(token)) {
        sessionStorage.removeItem('admin-auth-token');
        router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      } else {
        setIsAuthenticating(false);
      }
    }, [router]);

    if (isAuthenticating) {
      return null; // Or a loading spinner
    }

    return <WrappedComponent {...props} />;
  };

  return Wrapper;
};

export default withAuth;
