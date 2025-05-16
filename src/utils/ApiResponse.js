/**
 * Class to structure consistent API responses
 */
export class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {boolean} success - Whether the request was successful
   * @param {string} message - Response message
   * @param {any} data - Response data (optional)
   */
  constructor(statusCode, success, message, data = null) {
    this.statusCode = statusCode;
    this.success = success;
    this.message = message;
    this.data = data;
  }
} 