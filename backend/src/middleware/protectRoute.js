import { requireAuth, clerkClient } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;

      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      // find user in db by clerk ID, or create if doesn't exist
      let user = await User.findOne({ clerkId });

      if (!user) {
        // Get user data from Clerk using clerkClient
        const clerkUser = await clerkClient.users.getUser(clerkId);
        const newUser = {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
          profileImage: clerkUser.imageUrl,
        };

        user = await User.create(newUser);

        // Also create in Stream
        await upsertStreamUser({
          id: newUser.clerkId.toString(),
          name: newUser.name,
          image: newUser.profileImage,
        });
        
        console.log("✅ User created in DB:", user.email);
      }

      // attach user to req
      req.user = user;

      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
];
