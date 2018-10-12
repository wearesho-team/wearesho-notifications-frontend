import Axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import openSocket from "socket.io-client";
import { NotificationInterface } from "./NotificationInterface";
import { SubscriberInterface } from "./SubscriberInterface";

export class NotificationsAdapter {
    private readonly identifier: string;
    private authorizationToken: string;
    private axios: AxiosInstance;
    private socket: SocketIOClient.Socket;
    private subsribers: Array<SubscriberInterface> = [];

    protected get cacheKey(): string {
        return `wearesho.notification.authorizationToken.${this.identifier}`;
    }

    public constructor(url: URL, identifier: string) {
        this.identifier = identifier;

        this.socket = openSocket(url.origin, {
            path: url.pathname.replace(/\/?$/, "/socket.io"),
            transports: ["websocket"],
        });

        this.axios = Axios.create({
            baseURL: url.href,
            headers: { Authorization: this.authorizationToken },
        });

        this.axios.interceptors.response.use(undefined, this.handleError);
    }

    public authorize = async (requestCallable: () => Promise<string>): Promise<NotificationsAdapter> => {
        const stored = localStorage.getItem(this.cacheKey);
        if (stored) {
            this.authorizationToken = stored;
            return this;
        }

        this.authorizationToken = await requestCallable();
        localStorage.setItem(this.cacheKey, this.authorizationToken);

        return this;
    };

    public connect = (): NotificationsAdapter => {
        this.socket.on("deny", this.logout);

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
        }> = await this.axios.get("/notifications");

        return response.data.notifications;
    };

    public readNotification = async (id: string): Promise<void> => {
        await this.axios.patch("/notification", {}, { params: { id } });

        this.handleNotificationRead(id);
    };

    public deleteNotification = async (id: string): Promise<void> => {
        await this.axios.delete("/notification", { params: { id } });

        this.handleNotificationDelete(id);
    };

    public logout = () => {
        this.socket.close();
        localStorage.removeItem(this.cacheKey);
    };

    protected handleNewNotification = async (id: string): Promise<void> => {
        const response: AxiosResponse<{
            notification: NotificationInterface
        }> = await this.axios.get("/notification", { params: { id } });

        this.subsribers.forEach((subscriber) => subscriber.handleNew(response.data.notification));
    };

    protected handleNotificationRead = (notificationId: string) => {
        this.subsribers.forEach((subscriber) => subscriber.handleRead(notificationId));
    };

    protected handleNotificationDelete = (notificationId: string) => {
        this.subsribers.forEach((subscriber) => subscriber.handleDelete(notificationId));
    };

    protected handleError = (error: AxiosError) => {
        if (error.response && error.response.status === 401) {
            this.logout();
        }

        throw error;
    }
}
