import { saveDatabase } from '../../shared/utils/db.ts';
import { SiteData } from '../../shared/types/index.ts';
import { DEFAULT_SITE_DATA } from '../../../../frontend/src/shared/constants/defaultData.ts';

export class BackupService {
  async resetData(): Promise<SiteData> {
    await saveDatabase(DEFAULT_SITE_DATA);
    return DEFAULT_SITE_DATA;
  }

  async importData(imported: SiteData): Promise<SiteData> {
  if (!imported.adminPass || !imported.company || !Array.isArray(imported.members)) {
    throw new Error('Invalid data backup format');
  }
  // Never overwrite schemes via bulk import — schemes are managed via /api/schemes only
  const { schemes, ...dataWithoutSchemes } = imported;
  await saveDatabase({ ...dataWithoutSchemes, schemes: [] });
  return imported;
}
}
