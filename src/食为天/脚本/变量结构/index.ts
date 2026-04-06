import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from '../../../../角色卡/食为天/schema';

$(() => {
  registerMvuSchema(Schema);
});
