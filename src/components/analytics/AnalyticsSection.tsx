'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import type { Customer } from '@/types/customer';
import { STEP_PLATFORMS, STATUS_LABEL } from '@/types/customer';
import StatusDonutChart from './StatusDonutChart';
import StepFunnelChart from './StepFunnelChart';
import ReviewsByPlatformChart from './ReviewsByPlatformChart';
import RatingDistributionChart from './RatingDistributionChart';
import MonthlyGrowthChart from './MonthlyGrowthChart';

interface Props {
  customers: Customer[];
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [flipLeft, setFlipLeft] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Flip left if less than 280px (tooltip width + margin) to the right edge
      setFlipLeft(window.innerWidth - rect.right < 280);
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        ref={btnRef}
        onClick={handleOpen}
        aria-label="Chart info"
        className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 hover:border-[#e85d04] hover:text-[#e85d04] transition-colors flex items-center justify-center text-xs font-bold leading-none"
      >
        i
      </button>
      {open && (
        <div
          className={`absolute top-7 z-20 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs text-gray-600 leading-relaxed ${
            flipLeft ? 'right-0' : 'left-0'
          }`}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  info,
  isEmpty,
  emptyMessage = 'No data yet',
  children,
  className = '',
}: {
  title: string;
  info: string;
  isEmpty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex-1">{title}</h3>
        <InfoTooltip text={info} />
      </div>
      {isEmpty ? (
        <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6',
  completed: '#22c55e',
  pending: '#9ca3af',
  negative_feedback: '#ef4444',
  opted_out: '#f59e0b',
};

export default function AnalyticsSection({ customers }: Props) {
  const statusData = useMemo(
    () =>
      (['active', 'completed', 'pending', 'negative_feedback', 'opted_out'] as const)
        .map((status) => ({
          name: STATUS_LABEL[status],
          value: customers.filter((c) => c.status === status).length,
          color: STATUS_COLORS[status],
        }))
        .filter((d) => d.value > 0),
    [customers]
  );

  const stepFunnelData = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6].map((s) => ({
        step: `Step ${s}`,
        platform: STEP_PLATFORMS[s],
        reached: customers.filter((c) => c.current_step >= s).length,
        confirmed: customers.filter(
          (c) => c[`step${s}_confirmed` as keyof Customer] === 'yes'
        ).length,
      })),
    [customers]
  );

  const platformData = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6].map((s) => ({
        platform: STEP_PLATFORMS[s],
        reviews: customers.filter(
          (c) => c[`step${s}_confirmed` as keyof Customer] === 'yes'
        ).length,
      })),
    [customers]
  );

  const ratingData = useMemo(
    () =>
      ['1', '2', '3', '4', '5'].map((r) => ({
        rating: `${r}★`,
        count: customers.filter((c) => c.initial_rating === r).length,
        color: r <= '2' ? '#ef4444' : r === '3' ? '#f59e0b' : '#22c55e',
      })),
    [customers]
  );

  const noRatingCount = useMemo(
    () => customers.filter((c) => !c.initial_rating).length,
    [customers]
  );

  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (11 - i));
      const year = d.getFullYear();
      const month = d.getMonth();
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        customers: customers.filter((c) => {
          if (!c.created_date) return false;
          const cd = new Date(c.created_date);
          return cd.getFullYear() === year && cd.getMonth() === month;
        }).length,
      };
    });
  }, [customers]);

  const hasRatings = ratingData.some((d) => d.count > 0);
  const hasCreatedDates = customers.some((c) => c.created_date);
  const totalPlatformReviews = platformData.reduce((sum, d) => sum + d.reviews, 0);

  return (
    <div className="mt-6 space-y-4">
      {/* Row 1: Status donut (1/3) + Step funnel (2/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard
          title="Status Distribution"
          info="Shows the proportion of all customers by their current status — Active, Completed, Pending, Negative Feedback, or Opted Out. Use this to assess overall portfolio health at a glance."
          isEmpty={customers.length === 0}
          emptyMessage="No customers yet"
        >
          <StatusDonutChart data={statusData} total={customers.length} />
        </ChartCard>

        <ChartCard
          title="Step Completion Funnel"
          info="For each of the 6 review steps, the light bar shows how many customers reached that step, and the dark bar shows how many confirmed it. The gap between the two reveals where customers are dropping off in the sequence."
          isEmpty={customers.length === 0}
          emptyMessage="No customers yet"
          className="md:col-span-2"
        >
          <StepFunnelChart data={stepFunnelData} />
        </ChartCard>
      </div>

      {/* Row 2: Reviews by platform (1/2) + Rating distribution (1/2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          title="Reviews by Platform"
          info="Total confirmed reviews collected per platform — Google, Facebook, BBB, Yelp, and more. A customer counts toward a platform only once they've visited that review page and had it confirmed."
          isEmpty={totalPlatformReviews === 0}
          emptyMessage="No confirmed reviews yet"
        >
          <ReviewsByPlatformChart data={platformData} />
        </ChartCard>

        <ChartCard
          title="Initial Rating Distribution"
          info="How customers rated Hive on the landing page before being directed to a review platform. Red = 1–2 stars (no further requests sent), Amber = 3 stars, Green = 4–5 stars. Customers who haven't rated yet are shown as a footnote."
          isEmpty={!hasRatings}
          emptyMessage="No ratings collected yet"
        >
          <RatingDistributionChart data={ratingData} noRatingCount={noRatingCount} />
        </ChartCard>
      </div>

      {/* Row 3: Monthly growth — full width */}
      <ChartCard
        title="New Customers per Month (Last 12 Months)"
        info="Number of new customers added to the review system each month over the rolling 12-month window. Useful for spotting seasonal trends — roofing typically peaks in spring and fall following storm seasons."
        isEmpty={!hasCreatedDates}
        emptyMessage="No customer history yet"
      >
        <MonthlyGrowthChart data={monthlyData} />
      </ChartCard>
    </div>
  );
}
