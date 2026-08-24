import PlaceholderPage from '../../components/common/PlaceholderPage';

export default function NotFoundPage() {
  return (
    <PlaceholderPage
      title="404 Not Found"
      subtitle="The page you are looking for does not exist or may have been moved."
      eyebrow="Page missing"
      actionLabel="Return to dashboard"
      actionTo="/"
    />
  );
}
