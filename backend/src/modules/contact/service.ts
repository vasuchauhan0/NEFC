import { ContactRepository } from './repository.ts';
import { ContactMessage } from '../../shared/types/index.ts';

const repository = new ContactRepository();

export class ContactService {
  async getAllMessages(): Promise<ContactMessage[]> {
    return repository.getAll();
  }

  async addMessage(msg: Omit<ContactMessage, 'id' | 'date' | 'read'>): Promise<ContactMessage> {
    return repository.addMessage(msg);
  }

  async setReadState(id: string, read: boolean): Promise<void> {
    return repository.setReadState(id, read);
  }

  async markAllRead(): Promise<ContactMessage[]> {
    return repository.markAllRead();
  }

  async deleteMessage(id: string): Promise<void> {
    return repository.deleteMessage(id);
  }
}
