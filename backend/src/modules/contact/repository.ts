import { getDatabase, deleteMessageById, supabase } from '../../shared/utils/db';
import { ContactMessage } from '../../shared/types';

export class ContactRepository {
  async getAll(): Promise<ContactMessage[]> {
    const data = await getDatabase();
    return data.messages || [];
  }

  async addMessage(msg: Omit<ContactMessage, 'id' | 'date' | 'read'>): Promise<ContactMessage> {
    const id = `MSG-${Date.now()}`;
    const date = new Date().toISOString();
    const read = false;

    await supabase.from('contact_messages').insert({
      id,
      name: msg.name,
      contact: msg.contact,
      subject: msg.subject,
      message: msg.message,
      date,
      read,
    });
    
    return {
      ...msg,
      id,
      date,
      read
    };
  }

  async setReadState(id: string, read: boolean): Promise<void> {
    await supabase.from('contact_messages').update({ read }).eq('id', id);
  }

  async markAllRead(): Promise<ContactMessage[]> {
    await supabase.from('contact_messages').update({ read: true }).eq('read', false);
    return this.getAll();
  }

  async deleteMessage(id: string): Promise<void> {
    await deleteMessageById(id);
  }
}
