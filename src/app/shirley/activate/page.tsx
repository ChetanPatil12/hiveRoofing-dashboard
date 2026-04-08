import ActivationForm from '@/components/shirley/ActivationForm';

export default function ActivatePage() {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Start a New Job</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter the job and trade details. Shirley will begin coordinating scheduling automatically.
        </p>
      </div>
      <ActivationForm />
    </div>
  );
}
