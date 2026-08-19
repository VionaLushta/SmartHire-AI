import AuthCard from '../../components/auth/AuthCard';
import AuthHeader from '../../components/auth/AuthHeader';
import AuthIllustration from '../../components/auth/AuthIllustration';
import LoginForm from '../../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center gap-8 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_0.95fr]">
      <AuthIllustration
        subtitle="Welcome back"
        title="Sign in to keep your hiring pipeline moving."
        description="Review candidates, track interviews, and stay aligned with your team through a polished workspace designed for modern recruiting."
      />

      <div className="flex items-center justify-center">
        <AuthCard className="w-full max-w-xl p-6 sm:p-8">
          <div className="space-y-8">
            <AuthHeader
              title="Log in to SmartHire AI"
              description="Access your dashboard, review candidates, and continue the hiring workflow without friction."
            />
            <LoginForm />
          </div>
        </AuthCard>
      </div>
    </div>
  );
}
