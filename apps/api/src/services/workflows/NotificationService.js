export class NotificationService {
  notify(event) {
    return {
      delivered: true,
      event,
    };
  }
}
