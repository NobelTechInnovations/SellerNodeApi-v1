/**
 * Wraps an async function to handle promise rejections automatically
 * @param {Function} fn - Async function to be wrapped
 * @returns {Function} Wrapped function that handles async errors
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default catchAsync; 