import prisma from "@/lib/db";
import { getLexiconTranslation } from "@/lib/translation/translator";

import { hashPassword } from "@/lib/auth/password";
import crypto from "crypto";

/**
 * Ensures a system/support user exists to represent the official Typnex sender
 */
export async function getOrCreateOfficialSupportUser() {
  let supportUser = await prisma.user.findFirst({
    where: { role: "ADMIN", email: "support@typnex.com" },
  });

  if (!supportUser) {
    const randomSecret = crypto.randomUUID();
    const systemHash = await hashPassword(randomSecret);
    supportUser = await prisma.user.create({
      data: {
        email: "support@typnex.com",
        name: "Typnex Support",
        passwordHash: systemHash,
        role: "ADMIN",
        isVerified: true,
        emailVerified: true,
        preferredLanguage: "en",
      },
    });
  }

  return supportUser;
}

/**
 * Initializes the 3 required default onboarding conversations and messages
 * for a newly created user in their chosen language.
 */
export async function createDefaultUserConversations(userId: string, userName: string, language: string = "en") {
  const supportUser = await getOrCreateOfficialSupportUser();

  // Check if user already has any conversations to avoid duplicate seeding
  const existingCount = await prisma.conversation.count({
    where: { userId },
  });

  if (existingCount > 0) {
    return;
  }

  const welcomeContent = getLexiconTranslation("welcome_greeting", language, { name: userName });
  const sendAnythingContent = getLexiconTranslation("send_anything", language);
  const futureServicesContent = getLexiconTranslation("future_services", language);

  // CONVERSATION 1: Welcome & Support
  const conv1 = await prisma.conversation.create({
    data: {
      userId,
      title: "Welcome to Typnex 👋",
      status: "ACTIVE",
      isPinned: true,
      lastActivityAt: new Date(Date.now() + 3000),
      messages: {
        create: [
          {
            senderId: supportUser.id,
            senderRole: "ADMIN",
            content: welcomeContent,
            originalLanguage: language,
            isRead: false,
            deliveryState: "DELIVERED",
          },
        ],
      },
    },
  });

  // CONVERSATION 2: Send Us Anything
  const conv2 = await prisma.conversation.create({
    data: {
      userId,
      title: "Send Us Anything 📄",
      status: "ACTIVE",
      isPinned: false,
      lastActivityAt: new Date(Date.now() + 2000),
      messages: {
        create: [
          {
            senderId: supportUser.id,
            senderRole: "ADMIN",
            content: sendAnythingContent,
            originalLanguage: language,
            isRead: false,
            deliveryState: "DELIVERED",
          },
        ],
      },
    },
  });

  // CONVERSATION 3: Future Services
  const conv3 = await prisma.conversation.create({
    data: {
      userId,
      title: "Future Services 🚀",
      status: "ACTIVE",
      isPinned: false,
      lastActivityAt: new Date(Date.now() + 1000),
      messages: {
        create: [
          {
            senderId: supportUser.id,
            senderRole: "ADMIN",
            content: futureServicesContent,
            originalLanguage: language,
            isRead: false,
            deliveryState: "DELIVERED",
          },
        ],
      },
    },
  });

  return [conv1, conv2, conv3];
}
