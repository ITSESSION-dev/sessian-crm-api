// LEGAJO.AR â€” Capa de datos: empleados. SQL parametrizado, siempre filtrado por tenant.
const { query } = require('../../config/database');
const { rowToDTO } = require('./dto');

// Campos editables del legajo: camelCase (entrada API) -> snake_case (columna).
const MAP = {
  empresaId: 'empresa_id',
  legajo: 'legajo',
  apellido: 'apellido',
  nombre: 'nombre',
  cuil: 'cuil',
  fechaIngreso: 'fecha_ingreso',
  convenioId: 'convenio_id',
  categoriaId: 'categoria_id',
  basicoManual: 'basico_manual',
  afiliadoSindicato: 'afiliado_sindicato',
  supervisorId: 'supervisor_id',
  dni: 'dni',
  domicilio: 'domicilio',
  telefono: 'telefono',
  email: 'email',
  estadoCivil: 'estado_civil',
  cargasFamilia: 'cargas_familia',
  fechaNacimiento: 'fecha_nacimiento',
  puesto: 'puesto',
  modalidad: 'modalidad',
  horarioEntrada: 'horario_entrada',
  horarioSalida: 'horario_salida',
  obraSocial: 'obra_social',
  cbu: 'cbu',
  registroCategoria: 'registro_categoria',
  registroVence: 'registro_vence',
  libretaSanitariaVence: 'libreta_sanitaria_vence',
  fotoUrl: 'foto_url',
  fechaBaja: 'fecha_baja',
  motivoBaja: 'motivo_baja',
};

async function listar(tenantId, { empresaId, incluirBajas } = {}) {
  const cond = ['tenant_id = $1'];
  const vals = [tenantId];
  let i = 2;
  if (empresaId) { cond.push(`empresa_id = $${i++}`); vals.push(empresaId); }
  if (!incluirBajas) cond.push('fecha_baja IS NULL');
  const { rows } = await query(
    `SELECT * FROM legajo.empleado WHERE ${cond.join(' AND ')} ORDER BY apellido, nombre`,
    vals
  );
  return rows.map(rowToDTO);
}

async function obtener(tenantId, id) {
  const { rows } = await query(
    'SELECT * FROM legajo.empleado WHERE tenant_id = $1 AND id = $2',
    [tenantId, id]
  );
  return rows[0] ? rowToDTO(rows[0]) : null;
}

async function crear(tenantId, body) {
  const cols = ['tenant_id'];
  const ph = ['$1'];
  const vals = [tenantId];
  let i = 2;
  for (const [camel, snake] of Object.entries(MAP)) {
    if (body[camel] !== undefined) {
      cols.push(snake);
      ph.push(`$${i++}`);
      vals.push(body[camel] === '' ? null : body[camel]);
    }
  }
  const { rows } = await query(
    `INSERT INTO legajo.empleado (${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING *`,
    vals
  );
  return rowToDTO(rows[0]);
}

async function actualizar(tenantId, id, body) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [camel, snake] of Object.entries(MAP)) {
    if (body[camel] !== undefined) {
      sets.push(`${snake} = $${i++}`);
      vals.push(body[camel] === '' ? null : body[camel]);
    }
  }
  if (!sets.length) return obtener(tenantId, id);
  vals.push(tenantId, id);
  const { rows } = await query(
    `UPDATE legajo.empleado SET ${sets.join(', ')} WHERE tenant_id = $${i++} AND id = $${i} RETURNING *`,
    vals
  );
  return rows[0] ? rowToDTO(rows[0]) : null;
}

module.exports = { listar, obtener, crear, actualizar };
