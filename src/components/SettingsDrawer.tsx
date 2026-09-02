import React from 'react';
import {
  X,
  Sliders,
  Layout,
  Eye,
  Moon,
  Sun,
  Music
} from 'lucide-react';
import { UserPreferences } from '../data/userStore';
import { Vein, Soma, SomaLabel } from './organic/Organic';
import { useOverlayFocus } from '../utils/a11y';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: UserPreferences;
  onUpdatePrefs: (newPrefs: Partial<UserPreferences>) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  prefs,
  onUpdatePrefs
}) => {
  const panelRef = useOverlayFocus<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  const isDark = prefs.theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex justify-end rounded-none">
      {/* Backdrop */}
      <div className="scrim fixed inset-0 transition-opacity rounded-none" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Reader customization"
        className={`veil veil-left settle relative w-full max-w-sm h-full flex flex-col z-10 rounded-none ${
        isDark ? 'text-white' : 'text-black'
      }`}>

        {/* Top Header */}
        <div className="p-4 flex items-center justify-between rounded-none">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4" />
            <h2 className="font-light text-[12px] uppercase tracking-[0.2em]">Reader Customization</h2>
          </div>
          <button onClick={onClose} className="bud p-1.5 rounded-none" aria-label="Close settings">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="opacity-45 px-3">
          <Vein opacity={0.5} phase={5.1} />
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto soft-scroll p-4 space-y-7 text-[12px] rounded-none">

          {/* Ground — the light theme existed in full and was unreachable:
              every component and every .theme-light rule keyed off a preference
              nothing in the app ever set. */}
          <div className="space-y-2.5">
            <SomaLabel opacity={0.7} phase={6.7}>Ground</SomaLabel>
            <div className="grid grid-cols-2 gap-4">
              {([
                { id: 'dark', label: 'Dark', Icon: Moon },
                { id: 'light', label: 'Light', Icon: Sun }
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => onUpdatePrefs({ theme: id })}
                  aria-pressed={prefs.theme === id}
                  className={`bud p-3 flex items-center justify-center space-x-2 uppercase tracking-[0.2em] rounded-none ${
 prefs.theme === id ? 'bud-lit' : 'opacity-60'
 }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <SomaLabel opacity={0.7} phase={1.2}>Font Size</SomaLabel>
              <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-60">{prefs.fontSize}px</span>
            </div>
            <input
              type="range"
              min="12"
              max="20"
              step="1"
              value={prefs.fontSize}
              onChange={(e) => onUpdatePrefs({ fontSize: parseInt(e.target.value, 10) })}
              className="w-full accent-current cursor-pointer h-1 rounded-none opacity-80"
            />
          </div>

          {/* Line Height Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <SomaLabel opacity={0.7} phase={8.4}>Line Height</SomaLabel>
              <span className="text-[9px] font-light uppercase tracking-[0.2em] opacity-60">{prefs.lineHeight.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.3"
              max="2.0"
              step="0.1"
              value={prefs.lineHeight}
              onChange={(e) => onUpdatePrefs({ lineHeight: parseFloat(e.target.value) })}
              className="w-full accent-current cursor-pointer h-1 rounded-none opacity-80"
            />
          </div>

          {/* View Mode (Spread vs Single) */}
          <div className="space-y-2.5">
            <SomaLabel opacity={0.7} phase={12.6}>Reading Layout</SomaLabel>
            <div className="grid grid-cols-2 gap-4">
              {([
                { id: 'spread', label: '2-Page', rotate: false },
                { id: 'single', label: 'Single', rotate: true }
              ] as const).map(({ id, label, rotate }) => (
                <button
                  key={id}
                  onClick={() => onUpdatePrefs({ viewMode: id })}
                  className={`bud p-3 flex items-center justify-center space-x-2 uppercase tracking-[0.2em] rounded-none ${
 prefs.viewMode === id ? 'bud-lit' : 'opacity-60'
 }`}
                >
                  <Layout className={`w-4 h-4 ${rotate ? 'rotate-90' : ''}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Page Turn Animation Style */}
          <div className="space-y-2.5">
            <SomaLabel opacity={0.7} phase={16.9}>Page Turn</SomaLabel>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'tide', label: 'Tide' },
                { id: '3d-flip', label: '3D Flip' },
                { id: 'slide', label: 'Slide' },
                { id: 'fade', label: 'Fade' }
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => onUpdatePrefs({ animationStyle: id })}
                  className={`bud p-2 text-[12px] uppercase tracking-[0.2em] rounded-none ${
 prefs.animationStyle === id ? 'bud-lit' : 'opacity-60'
 }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Music. It starts on its own and it is 29MB, so it must have an
              exit — LY-04. No section label above it: the toggle already says
              what it is, and a heading over one control says it twice (TY-05).
              The page-turn sweep still has no control at all; that is recorded
              in docs/OPEN.md rather than fixed here, because the only name for
              it collides with the Page Turn section above. */}
          <div className="space-y-2.5 pt-1">
            <div className="opacity-40">
              <Vein opacity={0.45} phase={14.8} />
            </div>
            <label
              className={`flex items-center justify-between p-3 cursor-pointer rounded-none ${
                prefs.musicEnabled ? 'membrane-lit' : 'membrane-faint'
              }`}
            >
              <span className="flex items-center space-x-2.5 font-light">
                <Soma size={9} opacity={prefs.musicEnabled ? 1 : 0.4} phase={7.1} />
                <Music className="w-4 h-4" />
                <span>Music</span>
              </span>
              <input
                type="checkbox"
                checked={prefs.musicEnabled}
                onChange={(e) => onUpdatePrefs({ musicEnabled: e.target.checked })}
                className="accent-current cursor-pointer"
              />
            </label>
          </div>

          {/* Zen Mode Toggle */}
          <div className="space-y-2.5 pt-1">
            <div className="opacity-40">
              <Vein opacity={0.45} phase={3.3} />
            </div>
            <label
              className={`flex items-center justify-between p-3 cursor-pointer rounded-none ${
                prefs.zenMode ? 'membrane-lit' : 'membrane-faint'
              }`}
            >
              <span className="flex items-center space-x-2.5 font-light">
                <Soma size={9} opacity={prefs.zenMode ? 1 : 0.4} phase={10.2} />
                <Eye className="w-4 h-4" />
                <span>Zen Mode (Hide Chrome)</span>
              </span>
              <input
                type="checkbox"
                checked={prefs.zenMode}
                onChange={(e) => onUpdatePrefs({ zenMode: e.target.checked })}
                className="accent-current cursor-pointer"
              />
            </label>
          </div>

        </div>

        <div className="opacity-45 px-3">
          <Vein opacity={0.5} phase={18.2} />
        </div>
        <div className="p-3 text-center text-[9px] font-light uppercase tracking-[0.2em] opacity-50 rounded-none">
          Preferences saved locally
        </div>

      </div>
    </div>
  );
};
