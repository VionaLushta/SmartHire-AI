import BrandLockup from '../brand/BrandLockup';

export default function AuthHeader({ title, description, eyebrow = 'SmartHire AI' }) {
  return (
    <div className="space-y-5">
      <BrandLockup
        linkTo="/"
        subtitle="Premium hiring workflow"
        className="px-0 py-0"
      />

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          {eyebrow}
        </p>
        <h1 className="text-[48px] font-extrabold tracking-[-0.05em] text-slate-900">
          {title}
        </h1>
        <p className="max-w-xl text-[16px] font-medium leading-7 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
