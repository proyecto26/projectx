import React from 'react';
import type { Decorator } from '@storybook/react';

// Global decorator to ensure Tailwind CSS is properly applied
export const withTailwind: Decorator = (Story) => {
  return (
    <div className="p-4 m-2 bg-gray-100 rounded border border-gray-300 shadow-sm">
      <Story />
    </div>
  );
}; 