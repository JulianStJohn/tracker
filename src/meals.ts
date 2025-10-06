import { Router, Request, Response } from "express";
import { MongoStore } from "./mongo";
import { Meal, FoodItem } from "./types/collections.js";

// Helper function to calculate total calories
function calculateTotalKcal(foods: FoodItem[]): number {
  return foods.reduce((total, food) => total + food.kcal, 0);
}

export function makeMealRouter(mongo: MongoStore): Router {
  const router = Router();

  // GET /meals - Get recent meals (last 7 by default)
  router.get("/", async (req: Request, res: Response) => {
    try {
      const { limit } = req.query;
      const maxResults = typeof limit === 'string' ? parseInt(limit) || 7 : 7;
      
      const meals = await mongo.meals.find({})
        .sort({ date_last_used: -1 })
        .limit(maxResults)
        .toArray();
      
      res.json(meals);
    } catch (error) {
      console.error("Error fetching meals:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /meals/search - Search meals by name with tokenized search
  router.get("/search", async (req: Request, res: Response) => {
    try {
      const { q, limit } = req.query;
      const searchQuery = typeof q === 'string' ? q : '';
      const maxResults = typeof limit === 'string' ? parseInt(limit) || 10 : 10;
      
      let meals;
      if (searchQuery) {
        // Tokenize search query - split by spaces and create regex for each token
        const tokens = searchQuery.trim().toLowerCase().split(/\s+/);
        const regexConditions = tokens.map(token => ({
          name: { $regex: token, $options: 'i' }
        }));
        
        // All tokens must match (AND condition)
        meals = await mongo.meals.find({
          $and: regexConditions
        }).limit(maxResults).sort({ date_last_used: -1 }).toArray();
      } else {
        // Return recent meals if no search query
        meals = await mongo.meals.find({}).limit(maxResults).sort({ date_last_used: -1 }).toArray();
      }
      
      res.json(meals);
    } catch (error) {
      console.error("Error searching meals:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /meals/:id - Get a specific meal by ID or name
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Try to find by MongoDB ObjectId first
      let meal;
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(id)) {
          meal = await mongo.meals.findOne({ _id: new ObjectId(id) });
        }
      } catch (objectIdError) {
        // If ObjectId conversion fails, try finding by name
        meal = await mongo.getMealByName(id);
      }

      if (!meal) {
        return res.status(404).json({ error: "Meal not found" });
      }

      res.json(meal);
    } catch (error) {
      console.error("Error fetching meal:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /meals - Create a new meal
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { name, foods } = req.body;

      console.log(`\n=== POST /meals ===`);
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      // Validation
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "Meal name is required" });
      }

      if (!Array.isArray(foods)) {
        return res.status(400).json({ error: "Foods must be an array" });
      }

      // Validate each food item
      for (let i = 0; i < foods.length; i++) {
        const food = foods[i];
        if (!food.title || typeof food.title !== 'string' || !food.title.trim()) {
          return res.status(400).json({ error: `Food ${i + 1}: title is required` });
        }
        if (typeof food.kcal !== 'number' || food.kcal <= 0) {
          return res.status(400).json({ error: `Food ${i + 1}: valid calories are required` });
        }
        if (typeof food.weight !== 'number' || food.weight <= 0) {
          return res.status(400).json({ error: `Food ${i + 1}: valid weight is required` });
        }
      }

      // Check if meal with this name already exists
      const existingMeal = await mongo.getMealByName(name.trim());
      if (existingMeal) {
        return res.status(409).json({ error: "A meal with this name already exists" });
      }

      // Calculate total calories
      const total_kcal = calculateTotalKcal(foods);
      const now = new Date();

      // Create the meal
      const mealData: Omit<Meal, '_id'> = {
        name: name.trim(),
        foods: foods.map(food => ({
          title: food.title.trim(),
          kcal: Math.round(food.kcal),
          weight: Math.round(food.weight)
        })),
        total_kcal: Math.round(total_kcal),
        date_created: now,
        date_last_used: now
      };

      console.log('Creating meal:', JSON.stringify(mealData, null, 2));

      const newMeal = await mongo.createMeal(mealData);
      res.status(201).json(newMeal);

    } catch (error) {
      console.error("Error creating meal:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          res.status(400).json({ error: "A meal with this name already exists" });
        } else if (error.message.includes('Document failed validation')) {
          res.status(400).json({ 
            error: "Database validation failed", 
            details: error.message 
          });
        } else {
          res.status(500).json({ error: `Internal server error: ${error.message}` });
        }
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // PUT /meals/:id - Update an existing meal
  router.put("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, foods } = req.body;

      console.log(`\n=== PUT /meals/${id} ===`);
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      // Find the existing meal first
      let existingMeal;
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(id)) {
          existingMeal = await mongo.meals.findOne({ _id: new ObjectId(id) });
        }
      } catch (objectIdError) {
        // Try finding by name if ObjectId fails
        existingMeal = await mongo.getMealByName(id);
      }

      if (!existingMeal) {
        return res.status(404).json({ error: "Meal not found" });
      }

      // Validation (same as POST)
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "Meal name is required" });
      }

      if (!Array.isArray(foods)) {
        return res.status(400).json({ error: "Foods must be an array" });
      }

      // Validate each food item
      for (let i = 0; i < foods.length; i++) {
        const food = foods[i];
        if (!food.title || typeof food.title !== 'string' || !food.title.trim()) {
          return res.status(400).json({ error: `Food ${i + 1}: title is required` });
        }
        if (typeof food.kcal !== 'number' || food.kcal <= 0) {
          return res.status(400).json({ error: `Food ${i + 1}: valid calories are required` });
        }
        if (typeof food.weight !== 'number' || food.weight <= 0) {
          return res.status(400).json({ error: `Food ${i + 1}: valid weight is required` });
        }
      }

      // Check if another meal with this name exists (excluding current meal)
      if (name.trim() !== existingMeal.name) {
        const duplicateMeal = await mongo.getMealByName(name.trim());
        if (duplicateMeal && duplicateMeal._id.toString() !== existingMeal._id.toString()) {
          return res.status(409).json({ error: "A meal with this name already exists" });
        }
      }

      // Calculate total calories
      const total_kcal = calculateTotalKcal(foods);

      // Update the meal
      const updateData: Partial<Omit<Meal, '_id' | 'name' | 'date_created'>> & { name?: string } = {
        name: name.trim(),
        foods: foods.map(food => ({
          title: food.title.trim(),
          kcal: Math.round(food.kcal),
          weight: Math.round(food.weight)
        })),
        total_kcal: Math.round(total_kcal),
        date_last_used: new Date()
      };

      console.log('Update data:', JSON.stringify(updateData, null, 2));

      // Use MongoDB's updateOne directly since we need to handle name changes
      const result = await mongo.meals.findOneAndUpdate(
        { _id: existingMeal._id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(500).json({ error: "Failed to update meal" });
      }

      res.json(result);

    } catch (error) {
      console.error("Error updating meal:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('Document failed validation')) {
          res.status(400).json({ 
            error: "Database validation failed", 
            details: error.message 
          });
        } else {
          res.status(500).json({ error: `Internal server error: ${error.message}` });
        }
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // PUT /meals/:id/use - Update the last used date (when meal is added to a day)
  router.put("/:id/use", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Find the meal first
      let meal;
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(id)) {
          meal = await mongo.meals.findOne({ _id: new ObjectId(id) });
        }
      } catch (objectIdError) {
        meal = await mongo.getMealByName(id);
      }

      if (!meal) {
        return res.status(404).json({ error: "Meal not found" });
      }

      const updatedMeal = await mongo.updateMealLastUsed(meal.name);
      res.json(updatedMeal);

    } catch (error) {
      console.error("Error updating meal last used:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /meals/:id - Delete a meal
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      let deleted = false;
      
      // Try to delete by ObjectId first
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(id)) {
          const result = await mongo.meals.deleteOne({ _id: new ObjectId(id) });
          deleted = result.deletedCount > 0;
        }
      } catch (objectIdError) {
        // If ObjectId fails, try deleting by name
        deleted = await mongo.deleteMeal(id);
      }

      if (!deleted) {
        return res.status(404).json({ error: "Meal not found" });
      }

      res.json({ message: "Meal deleted successfully" });

    } catch (error) {
      console.error("Error deleting meal:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
