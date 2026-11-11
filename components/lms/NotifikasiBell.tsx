'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { NOTIFICATION_CHANGED_EVENT, type NotificationPreviewItem, type NotificationSource } from '@/types/notification.types';
import toast from 'react-hot-toast';
import { formatRelativeTime } from '@/lib/utils';
import { getNotificationTarget } from '@/lib/notification-navigation';

/**
 * Interval polling jumlah notifikasi belum dibaca (ms).
 */
const POLLING_INTERVAL = 60_000;

/**
 * Jumlah notifikasi yang ditampilkan pada panel lonceng.
 */
const MAX_ITEMS = 6;

/**
 * Lonceng inbox sistem dan LMS.
 *
 * Notifikasi bersifat personal (disimpan per `user_id`), sehingga komponen ini
 * tidak memakai permission modul — cukup relies pada token sesi pengguna.
 *
 * - Badge merah menampilkan jumlah notifikasi belum dibaca.
 * - Klik lonceng membuka panel berisi notifikasi terbaru.
 * - Klik notifikasi menandai sebagai dibaca lalu navigasi ke rute tujuan.
 * - Jumlah belum dibaca di-poll berkala (60 detik) agar badge tetap akurat.
 */
export default function NotifikasiBell() {
  const router = useRouter();

  const [counts, setCounts] = useState<Record<NotificationSource, number>>({ system: 0, lms: 0 });
  const unreadCount = counts.system + counts.lms;
  const [failedSources, setFailedSources] = useState<NotificationSource[]>([]);
  const [items, setItems] = useState<NotificationPreviewItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  const fetchUnreadCount = useCallback(async (): Promise<void> => {
    const result = await notificationService.getUnreadCounts();
    setCounts((previous) => ({ ...previous, ...result }));
  }, []);

  const fetchItems = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await notificationService.getPreview(MAX_ITEMS);
      setItems(result.items);
      setFailedSources(result.failedSources);
    } catch {
      setFailedSources(['system', 'lms']);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchUnreadCount);
    const timer = setInterval(fetchUnreadCount, POLLING_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  const toggleOpen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen((prev) => {
        const next = !prev;
        if (next) {
          updatePosition();
          fetchItems();
        }
        return next;
      });
    },
    [fetchItems, updatePosition]
  );

  // Tutup panel saat klik di luar, scroll, resize, atau tekan Escape.
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = () => setIsOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOpenItem = useCallback(
    async (item: NotificationPreviewItem) => {
      setIsOpen(false);

      if (!item.is_read) {
        try {
          await notificationService.markPreviewRead(item);
          setCounts((prev) => ({ ...prev, [item.source]: Math.max(0, prev[item.source] - 1) }));
          setItems((prev) =>
            prev.map((row) => (row.id === item.id && row.source === item.source ? { ...row, is_read: true } : row))
          );
        } catch {
          // Gagal menandai dibaca tidak menghalangi navigasi.
        }
      }

      const target = getNotificationTarget(item.url);
      if (target) router.push(target);
    },
    [router]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationService.markAllSourcesRead();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Gagal menandai notifikasi.');
    } finally {
      await Promise.all([fetchUnreadCount(), fetchItems()]);
    }
  }, [fetchUnreadCount, fetchItems]);

  useEffect(() => {
    const refresh = () => { void fetchUnreadCount(); if (isOpen) void fetchItems(); };
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
  }, [fetchUnreadCount, fetchItems, isOpen]);

  return (
    <div className="topbar-user-menu">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className="btn btn-ghost btn-icon topbar-bell"
        aria-label="Notifikasi"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Notifikasi"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span
            className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: 'var(--danger)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen && coords
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                right: `${coords.right}px`,
                width: '340px',
                maxWidth: 'calc(100vw - 16px)',
              }}
              className="rounded-lg bg-white border border-slate-200 shadow-xl z-[9999] overflow-hidden"
              role="menu"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase">Notifikasi</span>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="inline-flex items-center gap-1 text-2xs font-semibold text-slate-500 hover:text-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCheck size={13} />
                  Tandai semua dibaca
                </button>
              </div>

              {failedSources.length > 0 && (
                <p role="status" className="p-3 text-xs text-slate-600">Sebagian notifikasi belum dapat dimuat ({failedSources.join(', ')}).</p>
              )}
              <div className="max-h-[320px] overflow-y-auto">
                {isLoading && items.length === 0 ? (
                  <div className="px-3 py-4 text-2xs text-slate-500 text-center">Memuat notifikasi...</div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
                    <Inbox size={22} className="text-slate-300" />
                    <span className="text-2xs text-slate-500">Belum ada notifikasi</span>
                  </div>
                ) : (
                  items.map((item) => (
                    <button
                      key={`${item.source}:${item.id}`}
                      type="button"
                      onClick={() => handleOpenItem(item)}
                      className={`w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition ${
                        item.is_read ? '' : 'bg-slate-50/70'
                      }`}
                      role="menuitem"
                    >
                      <div className="flex items-start gap-2">
                        {!item.is_read ? (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: 'var(--danger)' }}
                            aria-label="Belum dibaca"
                          />
                        ) : (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {item.title}
                          </p>
                          {item.message ? (
                            <p className="text-2xs text-slate-500 line-clamp-2">{item.message}</p>
                          ) : null}
                          <p className="text-2xs text-slate-400 mt-0.5">
                            {item.label} ·{' '}
                            {formatRelativeTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="px-3 py-2 border-t border-slate-200 bg-slate-50">
                <Link
                  href="/notifikasi"
                  onClick={() => setIsOpen(false)}
                  className="block text-center text-xs font-semibold transition"
                  style={{ color: 'var(--module-primary, var(--primary-600))' }}
                >
                  Lihat semua notifikasi
                </Link>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
