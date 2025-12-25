import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';
import { useAuthStore } from '@/stores/auth';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // PocketBase handles OAuth callback automatically via URL params
        const authData = await pb.collection('users').authWithOAuth2({
          provider: 'google',
          urlCallback: window.location.href,
        });
        
        if (authData) {
          checkAuth();
          navigate('/');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/?error=oauth_failed');
      }
    };

    handleCallback();
  }, [navigate, checkAuth]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
}

