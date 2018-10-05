import axios, { AxiosResponse } from "axios";
import openSocket from "socket.io-client";
import { NotificationInterface } from "./NotificationInterface";

export class NotificationController {
    protected static readonly localStorageKey = "wearesho.notification.authorizationToken";

    public readonly notifications: Array<NotificationInterface> = [];

    protected url: string;

    private authorizationToken: string;
    private socket: SocketIOClient.Socket;
    private notificationListeners: Array<(notification: NotificationInterface) => void> = [];

    public constructor(url: string) {
        this.url = url;
        this.socket = openSocket(url);
    }

    public authorize = async (requestCallable: () => Promise<string>): Promise<NotificationController> => {
        const stored = localStorage.getItem(NotificationController.localStorageKey);
        if (stored) {
            this.authorizationToken = stored;
            return this;
        }

        this.authorizationToken = await requestCallable();
        localStorage.setItem(NotificationController.localStorageKey, this.authorizationToken);

        return this;
    }

    public init = (): Promise<NotificationController> => {
        return this.connect().loadNotifications();
    }

    public subscribe = (callback: (notification: NotificationInterface) => void): NotificationController => {
        this.notificationListeners.push(callback);
        return this;
    }

    public readNotification = async (notificationId: string): Promise<void> => {
        await axios.patch("/notification", {}, {
            baseURL: this.url,
            params: { id: notificationId },
            headers: { Authorization: this.authorizationToken },
        });

        const index = this.notifications.findIndex((notification) => notification.id === notificationId);
        if (index === -1) {
            return;
        }

        this.notifications[index].read = true;
    }

    public deleteNotification = async (notificationId: string): Promise<void> => {
        await axios.delete("/notification", {
            baseURL: this.url,
            params: { id: notificationId },
            headers: { Authorization: this.authorizationToken },
        });

        const index = this.notifications.findIndex((notification) => notification.id === notificationId);
        if (index === -1) {
            return;
        }

        this.notifications.splice(index, 1);
    }

    public logout = () => {
        this.socket.close();
        localStorage.removeItem(NotificationController.localStorageKey);
    }

    protected connect = (): NotificationController => {
        this.socket.on("deny", () => {
            // tslint:disable:no-console
            console.error("Invalid authorization token");
            localStorage.removeItem(NotificationController.localStorageKey);
        });

        this.socket.on("authorized", () => {
            this.socket.on("push", this.loadNotification);
        });

        this.socket.emit("auth", this.authorizationToken);

        return this;
    }

    protected loadNotifications = async (): Promise<NotificationController> => {
        const response: AxiosResponse<{
            notifications: Array<NotificationInterface>
        }> = await axios.get("/notifications", {
            baseURL: this.url,
            headers: { Authorization: this.authorizationToken },
        });

        this.notifications.push(...response.data.notifications);

        return this;
    }

    protected loadNotification = async (notificationId: string): Promise<void> => {
        const response: AxiosResponse<{
            notification: NotificationInterface
        }> = await axios.get("/notification", {
            baseURL: this.url,
            headers: { Authorization: this.authorizationToken },
            params: { id: notificationId },
        });

        this.notifications.push(response.data.notification);
        this.notificationListeners.forEach((callback) => callback(response.data.notification));
    }
}
