import AuthCard from '../../components/auth/AuthCard';
import AuthHeader from '../../components/auth/AuthHeader';
import AuthIllustration from '../../components/auth/AuthIllustration';
import RegisterForm from '../../components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center gap-8 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[0.95fr_1.05fr]">
      <AuthIllustration
        subtitle="Create your workspace"
        title="Build a hiring system that feels calm and capable."
        description="Set up a polished SmartHire AI account for your team and prepare a scalable recruiting workflow from day one."
        accent="Teams"
      />

      <div className="flex items-center justify-center">
        <AuthCard className="w-full max-w-2xl p-6 sm:p-8">
          <div className="space-y-8">
            <AuthHeader
              title="Create your account"
              description="Start with a clean, secure signup flow for candidates and companies."
            />
            <RegisterForm />
          </div>
        </AuthCard>
      </div>
    </div>
  );
}
