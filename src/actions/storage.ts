
'use server';

import { adminStorage } from '@/lib/firebase-admin';
import { dataURItoFile } from '@/lib/utils';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

// Este arquivo é intencionalmente deixado em branco.
// A lógica de upload de imagem foi movida para os componentes do lado do cliente
// (src/app/(main)/profile/edit/page.tsx e src/components/create-post-modal.tsx)
// para resolver erros persistentes de execução do lado do servidor com o Firebase Admin SDK.
