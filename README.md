# Wearesho Notifications Frontend

This library is a front-end adapter for
[Wearesho Notifications](https://github.com/wearesho-team/wearesho-notifications) service.
You can easily connect to notifications server and listen for updates.

## Setup

```bash
npm i --save @wearesho/notifications-frontend
```

## Usage

### Setting up environment

Create a [Notification Controller](./src/NotificationController.ts) instance

```typescript
import { NotificationController } from "@wearesho/notifications-frontend";

const notificationServerUrl = "http://url.to.your.notification.server/";
const notificationController = new NotificationController(notificationServerUrl);
```

You need to create a callback function that returns authorization token for user.

```typescript
import axios, { AxiosResponse } from "axios";

async function receiveAuthorizationToken() {
    const response: AxiosResponse<{ token: string }> = await axios.get("/receive-authorization-token");
    return response.data.token;
}
```

Pass this callback to function `authorize()`

```typescript
notificationController.authorize(receiveAuthorizationToken);
```

Note that this function is async, so it returns `Promise`

The next step is to call `connect()` for connecting socket and adding event listeners

```typescript
notificationController.connect();
```

### Notifications list

All notifications can be received by using `loadNotifications()`

```typescript
notificationController.loadNotifications()
    .then((notifications) => {
        // you have received all notifications for current user
    });
```

### Subscribers

To handle updates you may create an implementation of [SubscriberInterface](./src/SubscriberInterface.ts)

```typescript
import { SubscriberInterface, NotificationInterface } from "@wearesho/notifications-frontend";

class Subscriber implements SubscriberInterface {
    public handleNew = (notification: NotificationInterface) => {
        // do anything you want with notification
        // you can show it, add to notifications list etc.
    }

    public handleRead = (notificationId: string) => {
        // you can mark notification with specified id as read
    }

    public handleDelete = (notificationId: string) => {
        // you can delete notification from notifications list
    }
}
```

and then you should pass it to `subscribe()`

```typescript
notificationController.subscribe(new Subscriber);
```

### Actions with notifications

#### Read

To mark notification as read you should call `readNotification()`
and pass notification`s id

```typescript
const readNotificationId = 'id of read notification';
notificationController.readNotification(readNotificationId);
```

#### Delete

To delete notification you should use `deleteNotification()`

```typescript
const deletedNotificationId = 'id of deleted notification';
notificationController.deleteNotification(deletedNotificationId);
```

### Logout

If you want to close connection with notification server, you should call `logout()`

```typescript
user.logout(); // example action when you need to close connection
notificationController.logout();
```
