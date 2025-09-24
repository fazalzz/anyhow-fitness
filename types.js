"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    constructor(error, status) {
        super(error);
        this.error = error;
        this.status = status;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
