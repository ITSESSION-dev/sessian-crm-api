const createLead = async (req, res, next) => {
  try {
    const {
      title, contactId, contact,
      amount, currency = 'USD', expectedClose,
      source, notes, assignedTo, probability, pipelineStage = 'new'
    } = req.body;

    if (!title) throw new ValidationError('El título es obligatorio');

    let resolvedContactId = contactId;

    // Si no viene contactId, crear el contacto con los datos inline
    if (!resolvedContactId) {
      if (!contact) throw new ValidationError('El contacto es obligatorio');
      if (!contact.firstName) throw new ValidationError('El nombre del contacto es obligatorio');

      const contactResult = await query(
        `INSERT INTO contacts (tenant_id, first_name, last_name, email, phone, company_name, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          req.tenantId,
          contact.firstName,
          contact.lastName  || null,
          contact.email     || null,
          contact.phone     || null,
          contact.companyName || null,
          req.user.id
        ]
      );
      resolvedContactId = contactResult.rows[0].id;
    }

    const result = await query(
      `INSERT INTO leads (tenant_id, contact_id, title, pipeline_stage, amount, currency,
                          expected_close, source, notes, assigned_to, probability, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        req.tenantId, resolvedContactId, title, pipelineStage,
        amount || null, currency, expectedClose || null,
        source || null, notes || null,
        assignedTo || req.user.id, probability || 10, req.user.id
      ]
    );

    await query(
      `INSERT INTO activities (tenant_id, lead_id, contact_id, user_id, type, subject, is_completed)
       VALUES ($1,$2,$3,$4,'nota','Lead creado',true)`,
      [req.tenantId, result.rows[0].id, resolvedContactId, req.user.id]
    );

    created(res, {
      id: result.rows[0].id,
      title: result.rows[0].title,
      pipelineStage: result.rows[0].pipeline_stage
    });
  } catch (err) { next(err); }
};