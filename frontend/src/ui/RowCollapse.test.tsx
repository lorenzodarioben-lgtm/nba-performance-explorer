import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RowCollapse } from './RowCollapse';

function Table({ total, reveal = null }: { total: number; reveal?: number | null }) {
  return (
    <RowCollapse total={total} preview={6} noun="games" reveal={reveal}>
      {(visibleRows) => (
        <table>
          <tbody>
            {Array.from({ length: total }, (_, index) => (
              <tr key={index} hidden={index >= visibleRows || undefined}>
                <th scope="row">Game {index + 1}</th>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RowCollapse>
  );
}

describe('RowCollapse', () => {
  it('shows a preview, then every row, then the preview again', async () => {
    render(<Table total={20} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('rowheader')).toHaveLength(6);
    expect(screen.getByText('6 of 20 games')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'View all 20 games' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls');

    fireEvent.click(toggle);
    expect(within(table).getAllByRole('rowheader')).toHaveLength(20);
    // The same native button stays in place, so keyboard focus is never lost.
    expect(screen.getByRole('button', { name: 'Show less' })).toBe(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('All 20 games')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() =>
      expect(within(table).getAllByRole('rowheader')).toHaveLength(6),
    );
  });

  it('leaves a table that is barely over the preview open, with no button', () => {
    render(<Table total={7} />);
    expect(screen.getAllByRole('rowheader')).toHaveLength(7);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens when a hidden row is selected elsewhere', () => {
    const { rerender } = render(<Table total={20} reveal={3} />);
    expect(screen.getAllByRole('rowheader')).toHaveLength(6);
    rerender(<Table total={20} reveal={14} />);
    expect(screen.getAllByRole('rowheader')).toHaveLength(20);
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });
});
