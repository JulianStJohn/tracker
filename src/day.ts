import { Router, Request, Response } from "express";
import { MongoStore } from "./mongo";

export function makeDayRouter(mongo: MongoStore): Router {
  const router = Router();

  // GET /day/today - Get or create today's day entry
  router.get("/today", async (req: Request, res: Response) => {
    try {
      // Get today's date in YYYYMMDD format
      const today = new Date();
      const yyyymmdd = parseInt(
        today.getFullYear().toString() +
        (today.getMonth() + 1).toString().padStart(2, '0') +
        today.getDate().toString().padStart(2, '0')
      );

      // Try to find existing day
      let day = await mongo.days.findOne({ yyyymmdd });

      // If doesn't exist, create it
      if (!day) {
        const newDay = {
          yyyymmdd,
          meals: []
        };
        
        const result = await mongo.days.insertOne(newDay);
        day = await mongo.days.findOne({ _id: result.insertedId });
      }

      res.json(day);
    } catch (error) {
      console.error("Error in /day/today:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
