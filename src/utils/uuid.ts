/**
 * @module utils/uuid
 * Provides a utility function for generating Version 4 UUIDs.
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique Version 4 UUID (Universally Unique Identifier) string.
 *
 * @remarks
 * Uses the underlying 'uuid' library's v4 implementation.
 *
 * @returns A randomly generated UUID string (e.g., "f47ac10b-58cc-4372-a567-0e02b2c3d479").
 *
 * @see {@link https://www.npmjs.com/package/uuid | uuid npm package}
 */
export const generateUUID = (): string => {
  return uuidv4();
};