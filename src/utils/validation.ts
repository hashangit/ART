/**
 * @module utils/validation
 * @description Provides a utility function for validating data against JSON schemas using the Ajv library.
 * It includes caching for compiled schemas to improve performance.
 */
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import { Logger } from '@/utils/logger';

// Initialize Ajv
// We can configure Ajv options here if needed (e.g., strict mode, allErrors)
const ajv = new Ajv({ allErrors: true });

// Cache compiled validation functions for performance
const compiledValidators: Map<string, ValidateFunction> = new Map();

/**
 * Validates data against a given JSON schema using the Ajv library.
 *
 * @remarks
 * It caches compiled validation functions based on the schema's string representation
 * to improve performance for repeated validations against the same schema.
 *
 * @param schema - The JSON schema object to validate against.
 * @param data - The data object to be validated.
 * @returns An object containing the validation result.
 *
 * @example
 * const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
 * const validData = { name: 'ART' };
 * const invalidData = { name: 123 };
 *
 * const { isValid, errors } = validateJsonSchema(schema, validData); // isValid: true, errors: null
 * const { isValid: isInvalid, errors: errorDetails } = validateJsonSchema(schema, invalidData); // isInvalid: false, errors: [...]
 */
export function validateJsonSchema(schema: object, data: any): { isValid: boolean; errors: ErrorObject[] | null } {
  // Use a string representation of the schema as the cache key
  const schemaKey = JSON.stringify(schema);
  let validate: ValidateFunction;

  if (compiledValidators.has(schemaKey)) {
    validate = compiledValidators.get(schemaKey)!;
    Logger.debug('Using cached JSON schema validator.');
  } else {
    try {
      validate = ajv.compile(schema);
      compiledValidators.set(schemaKey, validate);
      Logger.debug('Compiled and cached new JSON schema validator.');
    } catch (error: any) {
      Logger.error(`Failed to compile JSON schema: ${error.message}`, { schema, error });
      // If schema compilation fails, treat validation as failed
      return {
        isValid: false,
        errors: [{
            keyword: 'compilation',
            instancePath: '',
            schemaPath: '',
            params: {},
            message: `Schema compilation failed: ${error.message}`
        }]
      };
    }
  }

  const isValid = validate(data);

  if (isValid) {
    return { isValid: true, errors: null };
  } else {
    Logger.warn('JSON schema validation failed.', { errors: validate.errors, data });
    return { isValid: false, errors: validate.errors || [] }; // Ensure errors is always an array
  }
}

/**
 * Clears the internal cache of compiled JSON schema validators.
 * This might be useful in testing scenarios or if schemas are dynamically updated
 * in a way that requires recompilation.
 */
export function clearJsonSchemaValidatorCache(): void {
    compiledValidators.clear();
    Logger.debug('Cleared JSON schema validator cache.');
}