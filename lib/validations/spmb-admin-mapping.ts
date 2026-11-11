import { z } from 'zod';

export const spmbAdminMappingSchema = z.object({
  user_ids: z.array(z.number().int('ID akun harus berupa bilangan bulat.').positive('ID akun harus positif.'))
    .max(100, 'Maksimal 100 akun penerima admin SPMB.'),
});
