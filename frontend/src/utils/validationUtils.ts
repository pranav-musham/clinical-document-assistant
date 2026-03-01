/**
 * Form Validation Utilities
 * Provides validation functions for authentication forms
 *
 * NOTE: These validations match the backend Pydantic schema constraints
 * defined in backend/app/schemas/user.py
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates email format
 * Matches Pydantic EmailStr validation on backend
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return {
      valid: false,
      error: 'Email is required',
    };
  }

  // More comprehensive email regex to match Pydantic EmailStr
  // This regex is based on RFC 5322 and matches most valid email formats
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: 'Please enter a valid email address',
    };
  }

  // Additional check for valid TLD (at least 2 characters)
  const parts = email.split('@');
  if (parts.length === 2) {
    const domain = parts[1];
    const tld = domain.split('.').pop();
    if (!tld || tld.length < 2) {
      return {
        valid: false,
        error: 'Please enter a valid email address',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates password strength
 * Matches backend Field(min_length=8) constraint
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password.trim() === '') {
    return {
      valid: false,
      error: 'Password is required',
    };
  }

  // Backend requires minimum 8 characters (no maximum, no complexity requirements)
  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  return { valid: true };
}

/**
 * Validates password confirmation matches
 * Frontend-only validation (not sent to backend)
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (!confirmPassword || confirmPassword.trim() === '') {
    return {
      valid: false,
      error: 'Please confirm your password',
    };
  }

  if (password !== confirmPassword) {
    return {
      valid: false,
      error: 'Passwords do not match',
    };
  }

  return { valid: true };
}

/**
 * Validates full name (optional field)
 * Matches backend Optional[str] = None (no constraints when provided)
 */
export function validateFullName(name: string): ValidationResult {
  // Name is completely optional on backend with no length constraints
  // Empty is valid, any non-empty value is also valid
  if (!name || name.trim() === '') {
    return { valid: true };
  }

  // Backend has no minimum or maximum length constraints
  // However, we'll keep a basic sanity check for UX
  return { valid: true };
}
