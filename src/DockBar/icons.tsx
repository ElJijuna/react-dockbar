import type { ReactElement } from 'react';

export const ChevronLeftIcon = (): ReactElement => {
  return (
    <svg
      viewBox="0 0 24 24"
      width="60%"
      height="60%"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
};
