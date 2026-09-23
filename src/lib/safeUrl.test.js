import { describe, it, expect } from 'vitest';
import { safeExternalUrl, displayUrl, cssUrl } from './safeUrl';

describe('safeExternalUrl', () => {
  it('keeps an ordinary link', () => {
    expect(safeExternalUrl('https://studio.example')).toBe('https://studio.example/');
    expect(safeExternalUrl('http://studio.example/work')).toBe('http://studio.example/work');
  });

  it('assumes https for a bare domain, which is what people actually type', () => {
    expect(safeExternalUrl('studio.example')).toBe('https://studio.example/');
    expect(safeExternalUrl('  studio.example/portfolio  ')).toBe('https://studio.example/portfolio');
  });

  it('REFUSES a javascript: URL instead of disguising it', () => {
    // The old guard produced "https://javascript:alert(1)" — harmless by luck,
    // and the check that was meant to catch it never ran.
    expect(safeExternalUrl('javascript:alert(document.cookie)')).toBeNull();
    expect(safeExternalUrl('JavaScript:alert(1)')).toBeNull();
    expect(safeExternalUrl('  javascript:alert(1)')).toBeNull();
  });

  it('refuses the rest of the dangerous scheme family', () => {
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull();
    expect(safeExternalUrl('file:///etc/passwd')).toBeNull();
    expect(safeExternalUrl('blob:https://evil.example/x')).toBeNull();
  });

  it('is not fooled by control characters inside the scheme', () => {
    // Browsers ignore tabs and newlines inside a scheme; a check that does not
    // strip them first can be walked straight past.
    expect(safeExternalUrl('java\tscript:alert(1)')).toBeNull();
    expect(safeExternalUrl('java\nscript:alert(1)')).toBeNull();
    expect(safeExternalUrl('\u0000javascript:alert(1)')).toBeNull();
  });

  it('returns null for nothing, rather than a fallback link', () => {
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl('   ')).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl(42)).toBeNull();
    expect(safeExternalUrl('https://')).toBeNull();
  });
});

describe('displayUrl', () => {
  it('shows the address without the scheme or a trailing slash', () => {
    expect(displayUrl('https://studio.example')).toBe('studio.example');
    expect(displayUrl('studio.example/work')).toBe('studio.example/work');
  });

  it('shows nothing for something it would not link to', () => {
    expect(displayUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('cssUrl', () => {
  it('wraps a safe image address', () => {
    expect(cssUrl('https://cdn.example/a.jpg')).toBe('url("https://cdn.example/a.jpg")');
  });

  it('refuses a value that could close the url() and append declarations', () => {
    expect(cssUrl('https://cdn.example/a.jpg"); color: red; background: url("x')).toBeNull();
    expect(cssUrl('https://cdn.example/a.jpg)')).toBeNull();
  });

  it('refuses a non-http scheme', () => {
    expect(cssUrl('javascript:alert(1)')).toBeNull();
    expect(cssUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBeNull();
  });

  it('gives back nothing for nothing, so the caller omits the style entirely', () => {
    expect(cssUrl('')).toBeNull();
    expect(cssUrl(undefined)).toBeNull();
  });
});
