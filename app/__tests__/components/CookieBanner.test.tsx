import { act, fireEvent, render, screen } from '@testing-library/react';
import CookieBanner from '../../components/CookieBanner';

let mockPathname = '/team';

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'it' }),
}));
jest.mock('posthog-js', () => ({
  opt_in_capturing: jest.fn(),
  opt_out_capturing: jest.fn(),
}));
jest.mock('@sft/design-system', () => ({
  Button: ({ children, onClick }: React.ComponentProps<'button'>) => (
    <button onClick={onClick}>{children}</button>
  ),
}));
jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ onReady }: { onReady: () => void }) => (
    <button onClick={onReady}>Simula caricamento Umami</button>
  ),
}));

beforeEach(() => {
  localStorage.clear();
  mockPathname = '/team';
});

afterEach(() => {
  delete window.umami;
});

it('does not load Umami before fresh consent or after refusal', () => {
  localStorage.setItem('cookieConsent', 'accepted');
  const { unmount } = render(<CookieBanner />);
  expect(screen.queryByText('Simula caricamento Umami')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Rifiuta' }));
  unmount();

  render(<CookieBanner />);
  expect(screen.queryByRole('button', { name: 'Accetta statistiche' })).not.toBeInTheDocument();
  expect(screen.queryByText('Simula caricamento Umami')).not.toBeInTheDocument();
});

it('tracks public paths only while the updated consent is active', () => {
  const track = jest.fn((transform) => transform({
    website: 'site-id',
    url: '/team?private=1',
    referrer: 'https://example.com/?private=1',
  }));
  window.umami = { track };
  const { rerender } = render(<CookieBanner />);

  fireEvent.click(screen.getByRole('button', { name: 'Accetta statistiche' }));
  fireEvent.click(screen.getByText('Simula caricamento Umami'));
  expect(track).toHaveReturnedWith({ website: 'site-id', url: '/team', referrer: '', title: '' });

  mockPathname = '/admin/events';
  rerender(<CookieBanner />);
  expect(track).toHaveBeenCalledTimes(1);

  mockPathname = '/boat';
  rerender(<CookieBanner />);
  expect(track).toHaveBeenCalledTimes(2);

  act(() => window.dispatchEvent(new Event('open-cookie-preferences')));
  fireEvent.click(screen.getByRole('button', { name: 'Rifiuta' }));
  mockPathname = '/contact';
  rerender(<CookieBanner />);
  expect(track).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Simula caricamento Umami')).not.toBeInTheDocument();
});
