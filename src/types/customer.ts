export type CustomerStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'negative_feedback'
  | 'opted_out';

export interface Customer {
  customer_id: string;
  job_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  review_link_base: string;
  current_step: number;
  status: CustomerStatus;
  last_milestone: string;
  job_closed_date: string;
  last_request_date: string;
  last_request_step: string;
  initial_rating: string;
  initial_feedback: string;
  step1_confirmed: string;
  step1_confirmed_date: string;
  step2_confirmed: string;
  step2_confirmed_date: string;
  step3_confirmed: string;
  step3_confirmed_date: string;
  step4_confirmed: string;
  step4_confirmed_date: string;
  step5_confirmed: string;
  step5_confirmed_date: string;
  step6_confirmed: string;
  step6_confirmed_date: string;
  notes: string;
  created_date: string;
  last_updated: string;
  post_close_reminder_count: string;
}

export const STEP_PLATFORMS: Record<number, string> = {
  1: 'Google Review',
  2: 'Facebook Review',
  3: 'Video Testimonial',
  4: 'BBB Review',
  5: 'Google Review (w/ Photos)',
  6: 'Yelp Review',
};

export const STATUS_LABEL: Record<CustomerStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  completed: 'Completed',
  negative_feedback: 'Negative Feedback',
  opted_out: 'Opted Out',
};

export const STATUS_STYLE: Record<CustomerStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  negative_feedback: 'bg-red-100 text-red-700 border-red-200',
  opted_out: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

export function countStepsConfirmed(customer: Customer): number {
  let count = 0;
  for (let i = 1; i <= 6; i++) {
    if (customer[`step${i}_confirmed` as keyof Customer] === 'yes') count++;
  }
  return count;
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
