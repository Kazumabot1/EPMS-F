import api from './api';

export type NotificationDto = {
  id: number;
  title: string;
  message: string;
  type?: string | null;
  isRead: boolean;
  createdAt?: string | null;
};

const unwrap = <T,>(payload: any, fallback: T): T => {
  return payload?.data?.data ?? payload?.data ?? fallback;
};

const isForbidden = (error: any) => {
  return error?.response?.status === 403;
};

export const notificationService = {
  async list(): Promise<NotificationDto[]> {
    try {
      const response = await api.get('/notifications');
      const data = unwrap<any>(response, []);

      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.content)) return data.content;
      if (Array.isArray(data?.items)) return data.items;

      return [];
    } catch (error: any) {
      if (isForbidden(error)) {
        return [];
      }

      throw error;
    }
  },

  async unreadCount(): Promise<number> {
    try {
      const response = await api.get('/notifications/unread-count');
      const data = unwrap<any>(response, 0);

      return Number(data ?? 0);
    } catch (error: any) {
      if (isForbidden(error)) {
        return 0;
      }

      throw error;
    }
  },

  async markAsRead(id: number): Promise<NotificationDto> {
    const response = await api.put(`/notifications/${id}/read`);
    return unwrap<NotificationDto>(response, {} as NotificationDto);
  },
};