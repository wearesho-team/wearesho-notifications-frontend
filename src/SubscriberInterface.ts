import { NotificationInterface } from "./NotificationInterface";

export interface SubscriberInterface {
    handleNew(notification: NotificationInterface): void;
    handleRead(notificationId: string): void;
    handleDelete(notificationId: string): void;
}
