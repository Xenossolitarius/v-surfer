import { expect } from 'vitest';
import { vSurferSerializer } from './v-surfer-serializer';

expect.addSnapshotSerializer(vSurferSerializer);
