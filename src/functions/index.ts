
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();

// Sends a notification to a user when a new notification document is created for them.
exports.sendPushNotification = onDocumentCreated("notifications/{notificationId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.log("No data associated with the event");
        return;
    }
    const data = snapshot.data();

    const toUserId = data.toUserId;
    const fromUserName = data.fromUser.name;
    const notificationText = data.text;
    const postId = data.postId;

    // Get the user's FCM token
    const userDoc = await getFirestore().collection("users").doc(toUserId).get();
    if (!userDoc.exists) {
        logger.log("User document not found:", toUserId);
        return;
    }
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
        logger.log("No FCM token for user:", toUserId);
        return;
    }

    const payload = {
        notification: {
            title: "Zispr",
            body: `${fromUserName} ${notificationText}`,
            icon: "/icon-192x192.png",
            click_action: postId ? `/post/${postId}` : `/profile/${data.fromUserId}`,
        },
        token: fcmToken,
        data: {
          url: postId ? `/post/${postId}` : `/profile/${data.fromUserId}`,
        }
    };

    try {
        logger.log("Sending notification to:", toUserId);
        await getMessaging().send(payload);
        logger.log("Successfully sent message");
    } catch (error) {
        logger.error("Error sending message:", error);
    }
});
