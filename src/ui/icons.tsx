/* 線画アイコン（外部依存なし） */
const S = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', viewBox: '0 0 24 24', 'aria-hidden': 'true' } as const;
export const IconLock = ({ on }: { on: boolean }) => (
  <svg {...S}><rect x="5" y="10.5" width="14" height="10" rx="2" />{on ? <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /> : <path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.8" />}<circle cx="12" cy="15.5" r="1.2" /></svg>
);
export const IconDice = () => (
  <svg {...S}><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /><circle cx="15" cy="9" r="1" fill="currentColor" /><circle cx="9" cy="15" r="1" fill="currentColor" /></svg>
);
export const IconFlask = () => (
  <svg {...S}><path d="M9.5 3h5M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 14.5h9" /></svg>
);
export const IconScroll = () => (
  <svg {...S}><path d="M7 4h11a2 2 0 0 1 2 2v1H9" /><path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" /><path d="M9 11h7M9 14.5h7" /></svg>
);
export const IconBook = () => (
  <svg {...S}><path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></svg>
);
export const IconHelp = () => (
  <svg {...S}><circle cx="12" cy="12" r="8.5" /><path d="M9.8 9.5a2.3 2.3 0 1 1 3.3 2.1c-.7.4-1.1.9-1.1 1.7" /><circle cx="12" cy="16.6" r=".6" fill="currentColor" /></svg>
);
export const IconMoon = () => (<svg {...S}><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" /></svg>);
export const IconSun = () => (<svg {...S}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>);
export const IconClose = () => (<svg {...S}><path d="M6 6l12 12M18 6L6 18" /></svg>);
