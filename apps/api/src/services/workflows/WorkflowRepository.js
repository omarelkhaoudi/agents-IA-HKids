export class WorkflowRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async ensureRules(rules) {
    for (const rule of rules) {
      await this.pool.query(
        `
          INSERT INTO workflow_rules (id, rule_name, from_state, to_state, metadata)
          VALUES ($1, $2, $3, $4, '{}'::jsonb)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          `rule-${rule.fromState}-${rule.toState}`.replace(/\s+/g, '-').toLowerCase(),
          `${rule.fromState} -> ${rule.toState}`,
          rule.fromState,
          rule.toState,
        ]
      );
    }
  }

  async createInstance(payload) {
    await this.pool.query(
      `
        INSERT INTO workflow_instances (
          id, conversation_id, document_id, current_state, approver_mode, required_approvals
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        payload.id,
        payload.conversationId,
        payload.documentId,
        payload.currentState,
        payload.approverMode,
        payload.requiredApprovals,
      ]
    );

    return this.getByDocumentId(payload.documentId);
  }

  async getByDocumentId(documentId) {
    const instanceResult = await this.pool.query(
      'SELECT * FROM workflow_instances WHERE document_id = $1 LIMIT 1',
      [documentId]
    );
    const instance = instanceResult.rows[0];

    if (!instance) {
      return null;
    }

    const [historyResult, commentsResult, assignmentsResult] = await Promise.all([
      this.pool.query(
        'SELECT * FROM workflow_history WHERE workflow_instance_id = $1 ORDER BY created_at ASC',
        [instance.id]
      ),
      this.pool.query(
        'SELECT * FROM workflow_comments WHERE workflow_instance_id = $1 ORDER BY created_at ASC',
        [instance.id]
      ),
      this.pool.query(
        'SELECT * FROM workflow_assignments WHERE workflow_instance_id = $1 ORDER BY created_at ASC',
        [instance.id]
      ),
    ]);

    return {
      id: instance.id,
      conversationId: instance.conversation_id,
      documentId: instance.document_id,
      currentState: instance.current_state,
      approverMode: instance.approver_mode,
      requiredApprovals: instance.required_approvals,
      history: historyResult.rows,
      comments: commentsResult.rows,
      assignments: assignmentsResult.rows,
    };
  }

  async updateState(workflowId, nextState) {
    await this.pool.query(
      `
        UPDATE workflow_instances
        SET current_state = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [workflowId, nextState]
    );
  }

  async addHistory(payload) {
    await this.pool.query(
      `
        INSERT INTO workflow_history (
          id, workflow_instance_id, actor, previous_state, new_state, comment
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        payload.id,
        payload.workflowInstanceId,
        payload.actor,
        payload.previousState || null,
        payload.newState,
        payload.comment || null,
      ]
    );
  }

  async addComment(payload) {
    await this.pool.query(
      `
        INSERT INTO workflow_comments (id, workflow_instance_id, actor, comment)
        VALUES ($1, $2, $3, $4)
      `,
      [payload.id, payload.workflowInstanceId, payload.actor, payload.comment]
    );
  }

  async assignReviewer(payload) {
    await this.pool.query(
      `
        INSERT INTO workflow_assignments (id, workflow_instance_id, reviewer, status)
        VALUES ($1, $2, $3, $4)
      `,
      [payload.id, payload.workflowInstanceId, payload.reviewer, payload.status || 'assigned']
    );
  }
}
