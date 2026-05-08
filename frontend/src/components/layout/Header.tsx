import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  notificationService,
  type NotificationDto,
} from '../../services/notificationService';

type HeaderProps = {
  collapsed: boolean;
};

type NotifItem = {
  id: number;
  title: string;
  message: string;
  type?: string | null;
  isRead?: boolean | null;
  createdAt?: string | number | number[] | null;
};

function unwrap<T>(res: { data?: { data?: T } & T }): T | undefined {
  const body = res?.data as { data?: T } | undefined;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data;
  }
  return res?.data as T | undefined;
}

function formatNotifTime(createdAt: NotifItem['createdAt']) {
  if (createdAt == null) return '';
  try {
    if (Array.isArray(createdAt)) {
      const [y, mo, d, h = 0, mi = 0, s = 0] = createdAt;
      return new Date(y, mo - 1, d, h, mi, s).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    }
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

function notifIconClass(type?: string | null) {
  const t = String(type ?? '')
    .trim()
    .toUpperCase();
  if (t === 'MEETING') return 'bi bi-calendar-event';
  if (t === 'PIP') return 'bi bi-clipboard2-pulse';
  if (t === 'APPRAISAL') return 'bi bi-exclamation-triangle';
  return 'bi bi-bell';
}

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

const Header = ({ collapsed }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? 'user@company.com';
  const userName = user?.fullName ?? 'User';
  const primaryRole = user?.roles?.[0] ?? 'User';
  const avatarLetter = (userName.trim().charAt(0) || email.charAt(0)).toUpperCase();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeNotif = useCallback(() => setNotifOpen(false), []);

  const loadNotifications = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      const list = unwrap<NotifItem[]>(listRes);
      const count = unwrap<number>(countRes);
      setNotifItems(Array.isArray(list) ? list.slice(0, 5) : []);
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      setNotifItems([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    void loadNotifications();
  }, [notifOpen, loadNotifications]);

  const loadNotifications = useCallback(async () => {
    try {
      setNotificationLoading(true);

      const [list, count] = await Promise.all([
        notificationService.list(),
        notificationService.unreadCount(),
      ]);

      setNotifications(list);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load notifications', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!menuOpen && !notificationOpen) return;

    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, notificationOpen]);

  useEffect(() => {
    if (!notifOpen) return;

    const onDocMouseDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen]);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login', { replace: true });
  };

  const markAsRead = async (notification: NotificationDto) => {
    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification.id);
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put('/notifications/read-all');
      await loadNotifications();
    } catch {
      /* ignore */
    }
  };

  const onNotifItemClick = async (id: number, isRead: boolean | null | undefined) => {
    if (isRead) return;
    try {
      await api.put(`/notifications/${id}/read`);
      await loadNotifications();
    } catch {
      /* ignore */
    }
  };

  return (
    <header className={`hr-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="hr-header-search">
        <i className="bi bi-search" />
        <input type="text" placeholder="Search employees, KPI, appraisals..." />
      </div>

      <div className="hr-header-actions">
        <div className="hr-notification-wrap" ref={notifRef}>
          <button
            type="button"
            className={`hr-icon-button hr-notification-trigger ${notifOpen ? 'is-open' : ''}`}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
            onClick={() => {
              setMenuOpen(false);
              setNotifOpen((o) => !o);
            }}
          >
            <i className="bi bi-bell" />
            {unreadCount > 0 ? (
              <span className="hr-notification-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {notifOpen && (
            <div className="hr-notif-popover" role="dialog" aria-label="Notifications">
              <div className="hr-notif-popover__header">
                <span className="hr-notif-popover__title">Notifications</span>
                <button type="button" className="hr-notif-popover__mark-all" onClick={markAllRead}>
                  Mark all read
                </button>
              </div>

              <div className="hr-notif-popover__body">
                {notifItems.length === 0 ? (
                  <p className="hr-notif-popover__empty">No notifications yet.</p>
                ) : (
                  notifItems.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`hr-notif-popover__item ${n.isRead ? '' : 'is-unread'}`}
                      onClick={() => onNotifItemClick(n.id, n.isRead)}
                    >
                      <i className={`hr-notif-popover__item-icon ${notifIconClass(n.type)}`} aria-hidden />
                      <span className="hr-notif-popover__item-main">
                        <span className="hr-notif-popover__item-title">{n.title}</span>
                        <span className="hr-notif-popover__item-msg">{n.message}</span>
                        <span className="hr-notif-popover__item-time">{formatNotifTime(n.createdAt)}</span>
                      </span>
                      <span
                        className={`hr-notif-popover__item-dot ${n.isRead ? 'is-read' : ''}`}
                        aria-hidden
                      />
                    </button>
                  ))
                )}
              </div>

              <div className="hr-notif-popover__footer">
                <Link
                  to="/notifications"
                  className="hr-notif-popover__view-all"
                  onClick={closeNotif}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>
        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="hr-icon-button hr-notification"
            aria-label="Notifications"
            aria-expanded={notificationOpen}
            onClick={() => {
              setNotificationOpen((prev) => !prev);
              setMenuOpen(false);
              void loadNotifications();
            }}
          >
            <i className="bi bi-bell" />
            {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>

          {notificationOpen && (
            <div
              className="hr-user-dropdown"
              role="menu"
              style={{
                right: 0,
                left: 'auto',
                width: 360,
                maxWidth: 'calc(100vw - 24px)',
                padding: 0,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <strong style={{ display: 'block', color: '#0f172a' }}>
                  Notifications
                </strong>
                <small style={{ color: '#64748b' }}>{unreadCount} unread</small>
              </div>

              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notificationLoading ? (
                  <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
                    No notifications.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void markAsRead(notification)}
                      style={{
                        width: '100%',
                        border: 0,
                        borderBottom: '1px solid #f1f5f9',
                        background: notification.isRead ? '#fff' : '#eff6ff',
                        padding: '12px 16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <strong style={{ color: '#0f172a', fontSize: 13 }}>
                          {notification.title}
                        </strong>

                        {!notification.isRead && (
                          <span
                            style={{
                              color: '#2563eb',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          margin: '5px 0',
                          color: '#475569',
                          fontSize: 12,
                          lineHeight: 1.4,
                        }}
                      >
                        {notification.message}
                      </p>

                      <small style={{ color: '#94a3b8' }}>
                        {formatDate(notification.createdAt)}
                      </small>
                    </button>
                  ))
                )}
              </div>

              <Link
                to="/notifications"
                className="hr-user-dropdown-item"
                onClick={() => setNotificationOpen(false)}
                style={{ borderTop: '1px solid #e5e7eb' }}
              >
                <i className="bi bi-list-check" />
                View all notifications
              </Link>
            </div>
          )}
        </div>

        <div className="hr-user-menu" ref={menuRef}>
          <button
            type="button"
            className="hr-user-chip"
            onClick={() => {
              setMenuOpen((open) => !open);
              setNotificationOpen(false);
            }}
            onClick={() => {
              setNotifOpen(false);
              setMenuOpen((o) => !o);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="hr-user-dropdown"
            id="hr-user-menu-button"
          >
            <span className="hr-user-avatar" aria-hidden>
              {avatarLetter}
            </span>

            <div className="hr-user-chip-meta">
              <strong>{userName}</strong>
              <small>{primaryRole}</small>
            </div>

            <i
              className={`bi hr-user-chevron ${
                menuOpen ? 'bi-chevron-up' : 'bi-chevron-down'
              }`}
              aria-hidden
            />
          </button>

          {menuOpen && (
            <div
              className="hr-user-dropdown"
              id="hr-user-dropdown"
              role="menu"
              aria-labelledby="hr-user-menu-button"
            >
              <Link
                to="/hr/profile"
                className="hr-user-dropdown-item"
                role="menuitem"
                onClick={closeMenu}
              >
                <i className="bi bi-person" />
                Profile
              </Link>

              <button
                type="button"
                className="hr-user-dropdown-item hr-user-dropdown-item-danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
