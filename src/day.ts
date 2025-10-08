import { Router, Request, Response } from "express";
import { MongoStore } from "./mongo";
import { Day, MealItem, FoodItem, ExerciseSession } from "./types/collections.js";
import { appConfig } from "./config.js";

// Helper function to create default empty meals
function createDefaultMeals(): MealItem[] {
  return [
    { title: "breakfast", foods: [] },
    { title: "lunch", foods: [] },
    { title: "dinner", foods: [] }
  ];
}

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

      // If doesn't exist, create it with default meals
      if (!day) {
        const newDay = {
          yyyymmdd,
          meals: createDefaultMeals(),
          goal_kcal: appConfig.goals.daily_kcal
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

  // GET /day/:yyyymmdd - Get or create a specific day entry
  router.get("/:yyyymmdd", async (req: Request, res: Response) => {
    try {
      const yyyymmdd = parseInt(req.params.yyyymmdd);
      
      // Validate date format
      if (isNaN(yyyymmdd) || !/^\d{8}$/.test(req.params.yyyymmdd)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYYMMDD." });
      }

      // Validate date is reasonable (between 1900 and 2100)
      if (yyyymmdd < 19000101 || yyyymmdd > 21001231) {
        return res.status(400).json({ error: "Date out of reasonable range." });
      }

      // Try to find existing day
      let day = await mongo.days.findOne({ yyyymmdd });

      // If doesn't exist, create it with default meals
      if (!day) {
        const newDay = {
          yyyymmdd,
          meals: createDefaultMeals(),
          goal_kcal: appConfig.goals.daily_kcal
        };
        
        const result = await mongo.days.insertOne(newDay);
        day = await mongo.days.findOne({ _id: result.insertedId });
      }

      res.json(day);
    } catch (error) {
      console.error(`Error in /day/${req.params.yyyymmdd}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /day/:yyyymmdd/meals - Add a new meal to a specific day
  router.post("/:yyyymmdd/meals", async (req: Request, res: Response) => {
    try {
      const yyyymmdd = parseInt(req.params.yyyymmdd);
      const { title, insertAfterIndex } = req.body;
      
      // Validate date format
      if (isNaN(yyyymmdd) || !/^\d{8}$/.test(req.params.yyyymmdd)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYYMMDD." });
      }

      // Validate meal title
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: "Meal title is required." });
      }

      // Find or create the day
      let day = await mongo.days.findOne({ yyyymmdd });
      if (!day) {
        const newDay = {
          yyyymmdd,
          meals: createDefaultMeals(),
          goal_kcal: appConfig.goals.daily_kcal
        };
        const result = await mongo.days.insertOne(newDay);
        day = await mongo.days.findOne({ _id: result.insertedId });
      }

      // Create new meal
      const newMeal: MealItem = {
        title: title.trim().toLowerCase(),
        foods: []
      };

      // Insert the meal at the specified position
      const meals = [...day!.meals];
      const insertIndex = typeof insertAfterIndex === 'number' && insertAfterIndex >= 0 ? insertAfterIndex + 1 : meals.length;
      meals.splice(insertIndex, 0, newMeal);

      // Update the day with the new meals array
      await mongo.days.updateOne(
        { yyyymmdd },
        { $set: { meals } }
      );

      // Return the updated day
      const updatedDay = await mongo.days.findOne({ yyyymmdd });
      res.json(updatedDay);
    } catch (error) {
      console.error(`Error adding meal to day ${req.params.yyyymmdd}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /day/:yyyymmdd - Update day fields (meals, notes, goal_kcal, etc.)
  router.put("/:yyyymmdd", async (req: Request, res: Response) => {
    try {
      const yyyymmdd = parseInt(req.params.yyyymmdd);
      const { meals, notes, goal_kcal, exercise_sessions } = req.body;
      
      // Validate date format
      if (isNaN(yyyymmdd) || !/^\d{8}$/.test(req.params.yyyymmdd)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYYMMDD." });
      }

      // Find the existing day or create it if it doesn't exist
      let existingDay = await mongo.days.findOne({ yyyymmdd });
      if (!existingDay) {
        // Create new day with default values
        const newDay = {
          yyyymmdd,
          meals: createDefaultMeals(),
          goal_kcal: appConfig.goals.daily_kcal
        };
        const result = await mongo.days.insertOne(newDay);
        existingDay = await mongo.days.findOne({ _id: result.insertedId });
      }

      // Build update object with only provided fields
      const updateFields: any = {};
      
      if (meals !== undefined) {
        // Validate meals array if provided
        if (!Array.isArray(meals)) {
          return res.status(400).json({ error: "Meals must be an array." });
        }
        updateFields.meals = meals;
      }
      
      if (notes !== undefined) {
        // Set notes or remove field if empty/null
        if (notes && notes.trim()) {
          updateFields.notes = notes.trim();
        } else {
          // If notes is empty/null, we'll use $unset to remove the field
          updateFields.$unset = updateFields.$unset || {};
          updateFields.$unset.notes = "";
        }
      }
      
      if (goal_kcal !== undefined) {
        // Validate goal_kcal if provided
        if (typeof goal_kcal !== 'number' || goal_kcal < 0) {
          return res.status(400).json({ error: "Goal kcal must be a positive number." });
        }
        updateFields.goal_kcal = goal_kcal;
      }
      
      if (exercise_sessions !== undefined) {
        // Validate exercise_sessions if provided
        if (!Array.isArray(exercise_sessions)) {
          return res.status(400).json({ error: "Exercise sessions must be an array." });
        }
        
        // Validate each exercise session
        for (const session of exercise_sessions) {
          if (!session.type || typeof session.type !== 'string') {
            return res.status(400).json({ error: "Each exercise session must have a valid type." });
          }
          if (!session.kcal || typeof session.kcal !== 'number' || session.kcal <= 0) {
            return res.status(400).json({ error: "Each exercise session must have a positive kcal value." });
          }
        }
        
        updateFields.exercise_sessions = exercise_sessions;
      }

      // Prepare the update operation
      const updateOperation: any = {};
      
      // Extract $unset operations if any
      const unsetFields = updateFields.$unset;
      delete updateFields.$unset;
      
      // Only update if there are fields to set or unset
      if (Object.keys(updateFields).length === 0 && !unsetFields) {
        return res.status(400).json({ error: "No valid fields provided for update." });
      }
      
      // Add $set operation if there are fields to set
      if (Object.keys(updateFields).length > 0) {
        updateOperation.$set = updateFields;
      }
      
      // Add $unset operation if there are fields to unset
      if (unsetFields) {
        updateOperation.$unset = unsetFields;
      }

      // Update the day with provided fields
      await mongo.days.updateOne(
        { yyyymmdd },
        updateOperation
      );

      // Return the updated day
      const updatedDay = await mongo.days.findOne({ yyyymmdd });
      res.json(updatedDay);
    } catch (error) {
      console.error(`Error updating day ${req.params.yyyymmdd}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /day/:yyyymmdd/meals/:mealIndex/foods - Add a food to a specific meal
  router.post("/:yyyymmdd/meals/:mealIndex/foods", async (req: Request, res: Response) => {
    try {
      const yyyymmdd = parseInt(req.params.yyyymmdd);
      const mealIndex = parseInt(req.params.mealIndex);
      const { foodId, weight, quantity, quantity_type } = req.body;
      
      // Validate date format
      if (isNaN(yyyymmdd) || !/^\d{8}$/.test(req.params.yyyymmdd)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYYMMDD." });
      }

      // Validate meal index
      if (isNaN(mealIndex) || mealIndex < 0) {
        return res.status(400).json({ error: "Invalid meal index." });
      }

      // Validate food data
      if (!foodId || typeof foodId !== 'string') {
        return res.status(400).json({ error: "Food ID is required." });
      }

      if (!weight || typeof weight !== 'number' || weight <= 0) {
        return res.status(400).json({ error: "Valid weight in grams is required." });
      }

      // Find the day
      const day = await mongo.days.findOne({ yyyymmdd });
      if (!day) {
        return res.status(404).json({ error: "Day not found." });
      }

      // Validate meal index exists
      if (mealIndex >= day.meals.length) {
        return res.status(400).json({ error: "Meal index out of range." });
      }

      // Get the food details
      let food;
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(foodId)) {
          food = await mongo.foods.findOne({ _id: new ObjectId(foodId) });
        }
      } catch (objectIdError) {
        // ObjectId creation failed, will try name lookup below
      }

      // If not found by ID, try to find by name
      if (!food) {
        food = await mongo.getFoodByName(foodId);
      }

      if (!food) {
        return res.status(404).json({ error: `Food not found: ${foodId}` });
      }

      // Calculate calories for this portion
      const kcal = Math.round((food.kcal_per_100g * weight) / 100);

      // Create the food item
      const foodItem: FoodItem = {
        title: food.name,
        kcal: kcal,
        weight: Math.round(weight)
      };

      // Add brand if it exists
      if (food.brand) {
        foodItem.brand = food.brand;
      }

      // Add quantity information if provided
      if (quantity !== null && quantity !== undefined) {
        foodItem.quantity = quantity;
      }
      if (quantity_type) {
        foodItem.quantity_type = quantity_type;
      }

      // Add the food to the meal
      const meals = [...day.meals];
      meals[mealIndex].foods.push(foodItem);

      // Update the day
      await mongo.days.updateOne(
        { yyyymmdd },
        { $set: { meals } }
      );

      res.json({ message: "Food added to meal successfully" });
    } catch (error) {
      console.error(`Error adding food to meal ${req.params.mealIndex} on day ${req.params.yyyymmdd}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /day/config - Get application configuration
  router.get("/config", async (req: Request, res: Response) => {
    try {
      res.json(appConfig);
    } catch (error) {
      console.error("Error fetching app config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
