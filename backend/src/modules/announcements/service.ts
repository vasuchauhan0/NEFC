import { getDatabase, supabase } from '../../shared/utils/db';
import { MemberService } from '../members/service.ts';
import { sendPushToAllMembers } from '../../shared/utils/push.service.ts';
import {
  sendAnnouncementWhatsAppToNumbers,
  sendAnnouncementImageWhatsApp,
  sendAnnouncementImageTextWhatsApp,
} from '../../shared/utils/whatsapp.service.ts';
import { deleteAnnouncementImageByUrl } from '../../shared/utils/uploads.ts';

const memberService = new MemberService();

// How long to wait after the broadcast call returns before deleting the
// image off disk. Meta's Graph API responding "success" just means the
// message was queued — the actual image fetch by WhatsApp's servers can
// lag a little behind that, especially across a big recipient list, so
// this buffer avoids deleting the file out from under a still-in-flight
// download and leaving some recipients with a broken image.
const IMAGE_CLEANUP_DELAY_MS = 60_000;

function cleanUpImageAfterBroadcast(broadcast: Promise<void>, imageUrl: string, label: string): void {
  broadcast
    .catch(err => console.error(`[WhatsApp] Announcement (${label}) broadcast failed:`, err.message))
    .finally(() => {
      setTimeout(() => deleteAnnouncementImageByUrl(imageUrl), IMAGE_CLEANUP_DELAY_MS);
    });
}

export class AnnouncementService {
  async getAnnouncement(): Promise<string> {
    const data = await getDatabase();
    return data.announcement || '';
  }

  async setAnnouncement(
    text: string,
    sendWhatsapp: boolean = false,
    extraPhones: string[] = [],
    imageUrl: string = '',
    recipientMode: 'all' | 'selected' = 'all',
    selectedMemberIds: string[] = []
  ): Promise<string> {
    const announcementVal = text || '';
    await supabase.from('site_settings').upsert({ key: 'announcement', value: announcementVal });

    const members = await memberService.getAllMembers();

    // Who counts as a "member recipient" for this send:
    //  - 'all'      → every Active member (the original broadcast behaviour)
    //  - 'selected' → only the specific member(s) the admin picked in the UI
    // Either way, hand-typed numbers (extraPhones) are added on top for WhatsApp.
    const targetMembers =
      recipientMode === 'selected'
        ? members.filter(m => selectedMemberIds.includes(m.id))
        : members.filter(m => m.status === 'Active');

    // Push notifications go to whichever members are targeted above — this
    // is silent/free and low-annoyance. Push has no image support here, and
    // no way to reach a raw phone number (extraPhones), so it only fires
    // when there's banner text and at least one targeted member.
    if (announcementVal.trim() && targetMembers.length > 0) {
      sendPushToAllMembers(targetMembers.map(m => m.id), {
        title: 'NEFC Announcement',
        body: announcementVal,
      }).catch(err => console.error('[Push] Announcement broadcast failed:', err.message));
    }

    // WhatsApp broadcast is OPT-IN per publish — only fires when the admin
    // explicitly ticks "Also send via WhatsApp" on the Announcements page,
    // since each send costs money / uses up template-messaging quota.
    // Unlike push, this can fire on an image-only send with no banner text.
    if (sendWhatsapp && (announcementVal.trim() || imageUrl)) {
      const memberPhones = targetMembers.map(m => m.phone).filter(Boolean) as string[];

      // Targeted member phones + hand-typed prospect numbers, deduped into
      // one list — whichever template fires below goes out to everyone in
      // one shot. When recipientMode is 'selected' and no members were
      // picked, this collapses to just the typed numbers — i.e. a send to
      // one or a handful of specific people only.
      const allPhones = Array.from(new Set([...memberPhones, ...(extraPhones || [])]));

      if (allPhones.length > 0) {
        if (imageUrl && announcementVal.trim()) {
          // Image + caption → "announcement_image_text" template
          cleanUpImageAfterBroadcast(
            sendAnnouncementImageTextWhatsApp(allPhones, imageUrl, announcementVal),
            imageUrl,
            'image+text'
          );
        } else if (imageUrl) {
          // Image only, no banner text → "announcement_image" template
          cleanUpImageAfterBroadcast(sendAnnouncementImageWhatsApp(allPhones, imageUrl), imageUrl, 'image');
        } else {
          // Text only → "announcement" template
          sendAnnouncementWhatsAppToNumbers(allPhones, announcementVal).catch(err =>
            console.error('[WhatsApp] Announcement (text) broadcast failed:', err.message)
          );
        }
      }
    }

    return announcementVal;
  }
}