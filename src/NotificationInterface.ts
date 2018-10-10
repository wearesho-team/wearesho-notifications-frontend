export interface NotificationInterface {
    id: string;
    message: string;
    type: string;
    time: string;
    read: boolean;
    context?: object;
}
