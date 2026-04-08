import JobsTable from '@/components/shirley/JobsTable';

export default function JobsPage() {
  return (
    <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of every job Shirley is managing</p>
        </div>
      </div>
      <JobsTable />
    </div>
  );
}
