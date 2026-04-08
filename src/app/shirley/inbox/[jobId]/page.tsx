'use client';

import { useParams, useRouter } from 'next/navigation';
import JobList from '@/components/shirley/JobList';
import JobDetail from '@/components/shirley/JobDetail';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  return (
    <div className="flex flex-1 h-[calc(100vh-57px)] overflow-hidden">
      <JobList selectedJobId={jobId} />
      <div className="flex-1 relative overflow-hidden">
        <JobDetail jobId={jobId} onClose={() => router.push('/shirley/inbox')} />
      </div>
    </div>
  );
}
