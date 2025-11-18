import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const withAuth = (WrappedComponent: React.ComponentType) => {
  const Wrapper = (props: any) => {
    const router = useRouter();
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    useEffect(() => {
      const token = sessionStorage.getItem('admin-auth-token');
      if (!token) {
        router.push('/login');
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
