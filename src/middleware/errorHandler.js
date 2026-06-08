class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class NotFoundError     extends AppError { constructor(msg = 'No encontrado') { super(msg, 404, 'NOT_FOUND'); } }
class ValidationError   extends AppError { constructor(msg, d) { super(msg, 400, 'VALIDATION_ERROR'); this.details = d; } }
class UnauthorizedError extends AppError { constructor(msg = 'No autorizado') { super(msg, 401, 'UNAUTHORIZED'); } }
class ForbiddenError    extends AppError { constructor(msg = 'No permitido') { super(msg, 403, 'FORBIDDEN'); } }
class ConflictError     extends AppError { constructor(msg = 'Ya existe') { super(msg, 409, 'CONFLICT'); } }
class PlanLimitError    extends AppError { constructor(msg = 'Límite del plan') { super(msg, 402, 'PLAN_LIMIT'); } }

const errorHandler = (err, req, res, next) => {
  if (err.code === '23505') return res.status(409).json({ error: 'El recurso ya existe', code: 'DUPLICATE' });
  if (err.code === '23503') return res.status(400).json({ error: 'Referencia inválida', code: 'FOREIGN_KEY' });
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {})
    });
  }
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
};

const ok      = (res, data, meta = {}) => res.status(200).json({ success: true, data, ...meta });
const created = (res, data)            => res.status(201).json({ success: true, data });
const paginated = (res, data, { page, limit, total }) =>
  res.status(200).json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });

module.exports = {
  AppError, NotFoundError, ValidationError, UnauthorizedError,
  ForbiddenError, ConflictError, PlanLimitError,
  errorHandler, ok, created, paginated
};