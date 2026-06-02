import ace from 'ace-builds';

// Expose ace globally for theme and mode files that expect window.ace to be defined
if (typeof window !== 'undefined') {
  (window as any).ace = ace;
}
