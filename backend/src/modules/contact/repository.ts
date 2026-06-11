import { getDatabase, saveDatabase, deleteMessageById } from '../../shared/utils/db.ts';
import { ContactMessage } from '../../shared/types/index.ts';

export class ContactRepository {
  async getAll(): Promise<ContactMessage[]> {
    const data = await getDatabase();
    return data.messages || [];
  }

  async addMessage(msg: Omit<ContactMessage, 'id' | 'date' | 'read'>): Promise<ContactMessage> {
    const data = await getDatabase();
    const newMsg: ContactMessage = {
      ...msg,
      id: `MSG-${Date.now()}`,
      date: new Date().toISOString(),
      read: false
    };

    data.messages = data.messages || [];
    data.messages.unshift(newMsg);
    await saveDatabase(data);
    return newMsg;
  }

  async setReadState(id: string, read: boolean): Promise<void> {
    const data = await getDatabase();
    data.messages = (data.messages || []).map(m => m.id === id ? { ...m, read } : m);
    await saveDatabase(data);
  }

  async markAllRead(): Promise<ContactMessage[]> {
    const data = await getDatabase();
    data.messages = (data.messages || []).map(m => ({ ...m, read: true }));
    await saveDatabase(data);
    return data.messages;
  }

  async deleteMessage(id: string): Promise<void> {
    // Direct targeted delete — does NOT touch other messages
    await deleteMessageById(id);
  }
}