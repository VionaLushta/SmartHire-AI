import Card from './Card';

export default function ErrorState({ title = 'Something went wrong', description = 'Please try again later.' }) {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </Card>
  );
}
