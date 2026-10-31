// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SplashScreen } from '../src/components/SplashScreen';
import { SidebarDrawer } from '../src/components/SidebarDrawer';
import { i18n } from '../src/services/i18n';

afterEach(() => { cleanup(); vi.useRealTimers(); i18n.setLanguage('en'); });

describe('GopalAI branding', () => {
  it('shows the logo and name while starting, then finishes on the existing schedule', () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    const { container } = render(<SplashScreen onFinish={finish} theme="light" />);
    expect(screen.getByRole('img', { name: 'GopalAI logo' }).getAttribute('src')).toBe('/gopalai-logo.png');
    expect(screen.getByRole('heading', { name: 'GopalAI' })).toBeTruthy();
    expect(container.querySelector('.brand-splash')?.getAttribute('data-theme')).toBe('light');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(finish).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it('cancels the startup callback when unmounted', () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    const { unmount } = render(<SplashScreen onFinish={finish} theme="dark" />);
    act(() => vi.advanceTimersByTime(1000));
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(finish).not.toHaveBeenCalled();
  });

  it('retains workspace switching, navigation and keyboard closing', () => {
    const close = vi.fn();
    const navigate = vi.fn();
    const select = vi.fn();
    const props = { isOpen: true, onClose: close, activeScreen: 'home', onNavigate: navigate, currentBusinessId: 'jain-sweets' as const, onSelectBusiness: select };
    render(<SidebarDrawer {...props} />);
    expect(screen.getByRole('dialog', { name: 'Main menu' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close menu' })).toBe(document.activeElement);
    expect(screen.getByRole('img', { name: 'GopalAI logo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Paan Bai Canteen', pressed: false }));
    expect(select).toHaveBeenCalledWith('paan-bai');
    fireEvent.click(screen.getByRole('button', { name: 'Sales Management' }));
    expect(navigate).toHaveBeenCalledWith('sales');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(3);
  });
});

it('keeps the header theme control without an install or download button', async () => {
  const { Header } = await import('../src/components/Header');
  render(<Header currentBusinessId="jain-sweets" onSelectBusiness={() => {}} onOpenDrawer={() => {}} onOpenVoiceOrb={() => {}} theme="dark" onToggleTheme={() => {}} isOnline onBack={() => {}} canGoBack={false} showBackButton={false} />);
  const header = screen.getByRole('banner');
  expect(header.querySelector('[title="Switch theme"]')).toBeTruthy();
  expect(header.querySelector('[title="Install Android App"]')).toBeNull();
  expect(header.querySelector('[title="Android App Info & Backup"]')).toBeNull();
  act(() => { window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })); });
  expect(header.querySelector('[title="Install Android App"]')).toBeNull();
});

it('shows only workspace names in the selector in English and Hindi', async () => {
  const { Header } = await import('../src/components/Header');
  const select = vi.fn();
  render(<Header currentBusinessId="jain-sweets" onSelectBusiness={select} onOpenDrawer={() => {}} onOpenVoiceOrb={() => {}} theme="dark" onToggleTheme={() => {}} isOnline onBack={() => {}} canGoBack showBackButton={false} />);
  const header = screen.getByRole('banner');
  expect(header.textContent).not.toContain('Sweets & Confectionery');
  fireEvent.click(screen.getByRole('button', { name: 'Choose workspace' }));
  expect(header.textContent).not.toMatch(/Confectionery|College & Event Canteen|Restaurant & Snacks|Catering & Event Management|Owner Private Account/);
  fireEvent.click(screen.getByRole('button', { name: 'Paan Bai Canteen' }));
  expect(select).toHaveBeenCalledWith('paan-bai');
  act(() => i18n.setLanguage('hi'));
  fireEvent.click(screen.getByRole('button', { name: 'कार्यक्षेत्र चुनें' }));
  expect(header.textContent).not.toMatch(/मिठाई और कन्फेक्शनरी|कॉलेज और कार्यक्रम कैंटीन|रेस्तरां और नाश्ता/);
  expect(screen.getByRole('button', { name: 'पान बाई कैंटीन' })).toBeTruthy();
});
