import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LineChart } from './LineChart';

function seriesPaths(container: HTMLElement) {
  return [...container.querySelectorAll('[data-series] path[fill="none"]')].map(
    (path) => path.getAttribute('d') ?? '',
  );
}

describe('LineChart', () => {
  it('never bridges a gap or an explicit break', () => {
    const { container } = render(
      <LineChart
        label="Test series"
        categories={['a', 'b', 'c', 'd', 'e']}
        format={(value) => value.toFixed(1)}
        series={[
          {
            id: 's',
            label: 'Series',
            color: '#3b82f6',
            values: [1, 2, null, 4, 5],
            breakBefore: [false, false, false, false, true],
          },
        ]}
      />,
    );
    const paths = seriesPaths(container);
    // [a–b] joined, c missing, then d and e are separate because of the explicit break.
    expect(paths).toHaveLength(3);
    expect(paths.filter((d) => d.includes('L'))).toHaveLength(1);
  });

  it('reads every point from the keyboard', () => {
    render(
      <LineChart
        label="Points"
        categories={['2022-23', '2023-24']}
        format={(value) => value.toFixed(1)}
        series={[{ id: 'p', label: 'Points', color: '#3b82f6', values: [25.7, null] }]}
      />,
    );
    const surface = screen.getByRole('group', { name: /Points\. Use the arrow keys/ });
    fireEvent.keyDown(surface, { key: 'Home' });
    expect(screen.getByText('2022-23: Points 25.7')).toBeInTheDocument();
    fireEvent.keyDown(surface, { key: 'ArrowRight' });
    expect(screen.getByText('2023-24: Points not recorded')).toBeInTheDocument();
  });
});
