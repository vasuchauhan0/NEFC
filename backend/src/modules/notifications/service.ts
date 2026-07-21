import { NotificationsRepository } from './repository.ts';
import { AppNotification } from '../../shared/types/index.ts';

const repository = new NotificationsRepository();

export class NotificationsService {
  async registerToken(memberId: string, token: string, deviceName?: string): Promise<void> {
    return repository.registerToken(memberId, token, deviceName);
  }

  async unregisterToken(token: string): Promise<void> {
    return repository.unregisterToken(token);
  }

  async getInbox(memberId: string): Promise<{ items: AppNotification[]; unreadCount: number }> {
    const items = await repository.list(memberId);
    const unreadCount = items.filter(n => !n.read).length;
    return { items, unreadCount };
  }

  async markRead(memberId: string, id: string): Promise<void> {
    return repository.markRead(memberId, id);
  }

  async markAllRead(memberId: string): Promise<void> {
    return repository.markAllRead(memberId);
  }
}