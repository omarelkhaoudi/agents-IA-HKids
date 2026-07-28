export class PromptDefinitionRepository {
  constructor(pool) {
    this.pool = pool;
  }

  mapPrompt(row) {
    return {
      id: row.id,
      promptGroupId: row.prompt_group_id,
      version: row.version,
      status: row.status,
      name: row.name,
      description: row.description,
      role: row.role,
      objective: row.objective,
      systemPrompt: row.system_prompt,
      instructions: row.instructions || [],
      constraints: row.constraints || [],
      validationChecklist: row.validation_checklist || [],
      outputStyle: row.output_style,
      updatedDate: row.updated_date,
    };
  }

  async count() {
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM prompt_definitions');
    return result.rows[0]?.count || 0;
  }

  async list() {
    const result = await this.pool.query(
      'SELECT * FROM prompt_definitions ORDER BY created_at DESC'
    );
    return result.rows.map((row) => this.mapPrompt(row));
  }

  async getById(id) {
    const result = await this.pool.query('SELECT * FROM prompt_definitions WHERE id = $1 LIMIT 1', [
      id,
    ]);
    const row = result.rows[0];
    return row ? this.mapPrompt(row) : null;
  }

  async create(prompt) {
    await this.pool.query(
      `
        INSERT INTO prompt_definitions (
          id, prompt_group_id, version, status, name, description, role, objective,
          system_prompt, instructions, constraints, validation_checklist, output_style, updated_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14)
      `,
      [
        prompt.id,
        prompt.promptGroupId,
        prompt.version,
        prompt.status,
        prompt.name,
        prompt.description || '',
        prompt.role,
        prompt.objective,
        prompt.systemPrompt,
        JSON.stringify(prompt.instructions || []),
        JSON.stringify(prompt.constraints || []),
        JSON.stringify(prompt.validationChecklist || []),
        prompt.outputStyle,
        prompt.updatedDate,
      ]
    );

    return this.getById(prompt.id);
  }

  async update(id, prompt) {
    await this.pool.query(
      `
        UPDATE prompt_definitions
        SET
          prompt_group_id = $2,
          version = $3,
          status = $4,
          name = $5,
          description = $6,
          role = $7,
          objective = $8,
          system_prompt = $9,
          instructions = $10::jsonb,
          constraints = $11::jsonb,
          validation_checklist = $12::jsonb,
          output_style = $13,
          updated_date = $14,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        prompt.promptGroupId,
        prompt.version,
        prompt.status,
        prompt.name,
        prompt.description || '',
        prompt.role,
        prompt.objective,
        prompt.systemPrompt,
        JSON.stringify(prompt.instructions || []),
        JSON.stringify(prompt.constraints || []),
        JSON.stringify(prompt.validationChecklist || []),
        prompt.outputStyle,
        prompt.updatedDate,
      ]
    );

    return this.getById(id);
  }

  async remove(id) {
    const result = await this.pool.query('DELETE FROM prompt_definitions WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}
