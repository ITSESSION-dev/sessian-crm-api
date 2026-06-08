const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { ok, created, ConflictError, UnauthorizedError, ValidationError } = require('../middleware/errorHandler');

const signAccess  = (userId, tenantId, role) =>
  jwt.sign({ userId, tenantId, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const userPublic = (u) => ({
  id: u.id, email: u.email,
  firstName: u.first_name, lastName: u.last_name,
  role: u.role, avatarInitials: u.avatar_initials,
  tenantId: u.tenant_id, tenantName: u.tenant_name, tenantPlan: u.plan
});

const register = async (req, res, next) => {
  try {
    const { companyName, email, password, firstName, lastName } = req.body;
    if (!companyName || !email || !password || !firstName || !lastName)
      throw new ValidationError('Todos los campos son obligatorios');
    if (password.length < 8)
      throw new ValidationError('La contraseña debe tener al menos 8 caracteres');

    const slug = companyName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 54) + '-' + uuid().substring(0, 6);

    const passwordHash = await bcrypt.hash(password, 12);
    const initials = (firstName[0] + lastName[0]).toUpperCase();

    const result = await withTransaction(async (client) => {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 30);

      const tenant = await client.query(
        `INSERT INTO tenants (slug, name, plan, status, trial_ends_at)
         VALUES ($1, $2, 'starter', 'trial', $3) RETURNING id, slug, name, plan, status`,
        [slug, companyName, trialEnds]
      );
      const tenantId = tenant.rows[0].id;

      await client.query(
        `INSERT INTO pipeline_stages_config (tenant_id, stage_key, label, color, position, default_probability)
         VALUES
           ($1,'new','Nuevo','#888780',1,10),
           ($1,'contact','Contactado','#378ADD',2,25),
           ($1,'qualify','Calificado','#BA7517',3,50),
           ($1,'proposal','Propuesta','#639922',4,75),
           ($1,'close','Cierre','#0F6E56',5,90)`,
        [tenantId]
      );

      const user = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, avatar_initials)
         VALUES ($1, $2, $3, $4, $5, 'admin', $6)
         RETURNING id, email, first_name, last_name, role, avatar_initials, tenant_id`,
        [tenantId, email.toLowerCase(), passwordHash, firstName, lastName, initials]
      );

      return { tenant: tenant.rows[0], user: { ...user.rows[0], tenant_name: companyName, plan: 'starter' } };
    });

    const accessToken = signAccess(result.user.id, result.tenant.id, result.user.role);
    created(res, { user: userPublic(result.user), accessToken });
  } catch (err) {
    if (err.code === '23505') next(new ConflictError('El email ya está registrado'));
    else next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ValidationError('Email y contraseña requeridos');

    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name,
              u.role, u.avatar_initials, u.is_active,
              t.id as tenant_id, t.name as tenant_name, t.plan, t.status as tenant_status
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) throw new UnauthorizedError('Credenciales inválidas');
    const user = result.rows[0];
    if (!user.is_active) throw new UnauthorizedError('Cuenta desactivada');
    if (user.tenant_status === 'suspended') throw new UnauthorizedError('Cuenta suspendida');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedError('Credenciales inválidas');

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    const accessToken = signAccess(user.id, user.tenant_id, user.role);
    ok(res, { user: userPublic(user), accessToken });
  } catch (err) { next(err); }
};

const me = async (req, res, next) => {
  try { ok(res, userPublic(req.user)); }
  catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try { ok(res, { message: 'Sesión cerrada' }); }
  catch (err) { next(err); }
};

module.exports = { register, login, me, logout };