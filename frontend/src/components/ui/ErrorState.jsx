import Card from './Card';

export default function ErrorState({ title = 'Something went wrong', description = 'Please try again later.' }) {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-[24px] font-bold tracking-[-0.04em] text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </Card>
  );
}
