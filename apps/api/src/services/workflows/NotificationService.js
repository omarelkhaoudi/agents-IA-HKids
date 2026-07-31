export class NotificationService {
  constructor({ workflowRepository = null } = {}) {
    this.workflowRepository = workflowRepository;
  }

  notify(event) {
    const channels = event.channels || ['in_app'];
    const recipients = event.recipients?.length
      ? event.recipients
      : [event.actor || event.reviewer || 'workflow-admin'];
    const deliveries = channels.flatMap((channel) =>
      recipients.map((recipient) => ({
        channel,
        recipient,
        eventType: event.eventType || 'workflow_state_changed',
        workflowInstanceId: event.workflowId || event.workflowInstanceId || null,
        status: channel === 'in_app' ? 'delivered' : 'queued',
      }))
    );

    for (const delivery of deliveries) {
      if (this.workflowRepository?.saveNotification) {
        void this.workflowRepository.saveNotification({
          ...delivery,
          payload: event,
          deliveredAt: delivery.status === 'delivered' ? new Date() : null,
        });
      }
    }

    return {
      delivered: true,
      channels,
      recipients,
      deliveries,
      event,
    };
  }
}
