import React from 'react';
import { Upload } from 'lucide-react';

export type AppView = 'grading' | 'subjects' | 'recap' | 'advice';

interface HeaderNavProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  onTriggerUpload: () => void;
}

const NAV_ITEMS: { id: AppView; label: string }[] = [
  { id: 'grading', label: 'Koreksi Lembar' },
  { id: 'subjects', label: 'Mapel & Kunci' },
  { id: 'recap', label: 'Rekap Nilai' },
  { id: 'advice', label: 'Saran Arsitektur' },
];

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeView,
  onChangeView,
  onTriggerUpload,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 no-print">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark only */}
        <button
          type="button"
          onClick={() => onChangeView('grading')}
          className="text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
        >
          AsesmenSMK
        </button>

        {/* Zone 2: 4 single-line navigation links */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                  isActive
                    ? 'border-indigo-700 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTriggerUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Unggah Lembar</span>
          </button>
        </div>
      </div>

      {/* Mobile secondary nav */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeView(item.id)}
              className={`text-xs font-medium py-1 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive ? 'text-indigo-700 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
