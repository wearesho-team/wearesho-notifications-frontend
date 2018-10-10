import axios, { AxiosResponse } from "axios";
import openSocket from "socket.io-client";
import { NotificationInterface } from "./NotificationInterface";
import { SubscriberInterface } from "./SubscriberInterface";

export class NotificationsAdapter {
    protected static readonly localStorageKey = "wearesho.notification.authorizationToken";

    protected url: URL;

    private authorizationToken: string;
    private socket: SocketIOClient.Socket;
    private subsribers: Array<SubscriberInterface> = [];

    public constructor(url: URL) {
        this.url = url;
        this.socket = openSocket(url.origin, {
            path: url.pathname.replace(/\/?$/, "/socket.io"),
            transports: ["websocket"],
        });
    }

    public authorize = async (requestCallable: () => Promise<string>): Promise<NotificationsAdapter> => {
        const stored = localStorage.getItem(NotificationsAdapter.localStorageKey);
        if (stored) {
            this.authorizationToken = stored;
            return this;
        }

        this.authorizationToken = await requestCallable();
        localStorage.setItem(NotificationsAdapter.localStorageKey, this.authorizationToken);

        return this;
    };

    public connect = (): NotificationsAdapter => {
        this.socket.on("deny", () => {
            // tslint:disable:no-console
            console.error("Invalid authorization token");
            localStorage.removeItem(NotificationsAdapter.localStorageKey);
        });

        this.socket.on("authorized", () => {
            this.socket.on("push", this.handleNewNotification);
            this.socket.on("patch", this.handleNotificationRead);
            this.socket.on("delete", this.handleNotificationDelete);
        });

        this.socket.emit("auth", this.authorizationToken);

        return this;
    };

    public subscribe = (subscriber: SubscriberInterface): NotificationsAdapter => {
        this.subsribers.push(subscriber);
        return this;
    };

    public loadNotifications = async (): Promise<Array<NotificationInterface>> => {
        const response: AxiosResponse<{
            notifications: Array<NotificationInterface>
        }> = await axios.get("/notifications", {
            baseURL: this.url.href,
            headers: { Authorization: this.authorizationToken },
        });

        return response.data.notifications;
    };

    public readNotification = async (notificationId: string): Promise<void> => {
        await axios.patch("/notification", {}, {
            baseURL: this.url.href,
            params: { id: notificationId },
            headers: { Authorization: this.authorizationToken },
        });

        this.handleNotificationRead(notificationId);
    };

    public deleteNotification = async (notificationId: string): Promise<void> => {
        await axios.delete("/notification", {
            baseURL: this.url.href,
            params: { id: notificationId },
            headers: { Authorization: this.authorizationToken },
        });

        this.handleNotificationDelete(notificationId);
    };

    public logout = () => {
        this.socket.close();
        localStorage.removeItem(NotificationsAdapter.localStorageKey);
    };

    protected handleNewNotification = async (notificationId: string): Promise<void> => {
        const response: AxiosResponse<{
            notification: NotificationInterface
        }> = await axios.get("/notification", {
            baseURL: this.url.href,
            headers: { Authorization: this.authorizationToken },
            params: { id: notificationId },
        });

        this.subsribers.forEach((subscriber) => subscriber.handleNew(response.data.notification));
    };

    protected handleNotificationRead = (notificationId: string) => {
        this.subsribers.forEach((subscriber) => subscriber.handleRead(notificationId));
    };

    protected handleNotificationDelete = (notificationId: string) => {
        this.subsribers.forEach((subscriber) => subscriber.handleDelete(notificationId));
    }
}
