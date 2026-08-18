import { defineMvuDataStore } from '@util/mvu';
import { Schema } from '../../../../角色卡/食为天/schema';

export const useDataStore = defineMvuDataStore(Schema, { type: 'message', message_id: getCurrentMessageId() });
