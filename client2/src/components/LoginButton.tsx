import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../auth';

export default function LoginButton() {
  const { login } = useAuth();

  const handleSuccess = (response: CredentialResponse) => {
    if (response.credential) {
      login(response.credential);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => console.error('Google login failed')}
      size="large"
      theme="filled_black"
      shape="pill"
    />
  );
}
