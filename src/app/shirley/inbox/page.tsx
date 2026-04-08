import JobList from '@/components/shirley/JobList';

export default function InboxPage() {
  return (
    <div className="flex flex-1 h-[calc(100vh-57px)] overflow-hidden">
      <JobList />
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Select a job to view the conversation</p>
          <p className="text-xs text-gray-400 mt-1">Choose a job from the list on the left</p>
        </div>
      </div>
    </div>
  );
}
