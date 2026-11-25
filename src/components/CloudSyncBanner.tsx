import React from 'react';
import { User } from 'firebase/auth';
import { Cloud, CloudOff, LogIn, LogOut } from 'lucide-react';

interface CloudSyncBannerProps {
  user: User | null;
  authReady: boolean;
  syncState: 'idle' | 'syncing' | 'synced' | 'error';
  authError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onClearAuthError: () => void;
}

export const CloudSyncBanner: React.FC<CloudSyncBannerProps> = ({
  user,
  authReady,
  syncState,
  authError,
  onSignIn,
  onSignOut,
  onClearAuthError,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 no-print">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {!authReady ? (
          <div className="text-xs text-slate-500">Memeriksa status akun sinkronisasi...</div>
        ) : user ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 min-w-0">
              <Cloud className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-slate-900">Sinkronisasi Cloud Aktif</span>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="truncate max-w-[260px] sm:max-w-none">
                {user.displayName || 'Guru SMK'} ({user.email})
              </span>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span
                className={
                  syncState === 'syncing'
                    ? 'text-indigo-700 font-medium'
                    : syncState === 'error'
                    ? 'text-red-700 font-medium'
                    : 'text-emerald-700 font-medium'
                }
              >
                {syncState === 'syncing'
                  ? 'Menyimpan ke cloud...'
                  : syncState === 'error'
                  ? 'Gagal sinkron'
                  : 'Tersinkronisasi otomatis'}
              </span>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Keluar Akun</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
              <CloudOff className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <span>
                <strong>Mode Lokal</strong>
                <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                Login dengan Google agar 8 mapel, kunci PG, dan nilai siswa tersinkron otomatis saat pindah perangkat.
              </span>
            </div>

            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Login Google</span>
            </button>
          </>
        )}
      </div>

      {authError && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-2.5">
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3 text-xs text-red-800">
            <span>{authError}</span>
            <button
              type="button"
              onClick={onClearAuthError}
              className="font-semibold text-red-700 hover:underline shrink-0 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
