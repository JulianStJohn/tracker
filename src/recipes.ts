import { Router, Request, Response } from "express";
import { MongoStore } from "./mongo";
import { Recipe, FoodItem } from "./types/collections.js";
import { ObjectId } from "mongodb";

// Helper function to calculate total calories
function calculateTotalKcal(foods: FoodItem[]): number {
  return foods.reduce((total, food) => total + food.kcal, 0);
}

export function makeRecipeRouter(mongo: MongoStore): Router {
  const router = Router();

  // GET /recipes - Get recent recipes (last 7 by default)
  router.get("/", async (req: Request, res: Response) => {
    try {
      const { limit } = req.query;
      const maxResults = typeof limit === 'string' ? parseInt(limit) || 7 : 7;
      
      const recipes = await mongo.recipes.find({})
        .sort({ date_last_used: -1 })
        .limit(maxResults)
        .toArray();
      
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /recipes/search - Search recipes by name and ingredients with tokenized search
  router.get("/search", async (req: Request, res: Response) => {
    try {
      const { q, limit } = req.query;
      const searchQuery = typeof q === 'string' ? q : '';
      const maxResults = typeof limit === 'string' ? parseInt(limit) || 10 : 10;
      
      let recipes;
      if (searchQuery) {
        // Tokenize search query - split by spaces and create regex for each token
        const tokens = searchQuery.trim().toLowerCase().split(/\s+/);
        const regexConditions = tokens.map(token => ({
          $or: [
            { name: { $regex: token, $options: 'i' } },
            { steps: { $regex: token, $options: 'i' } },
            { 'foods.title': { $regex: token, $options: 'i' } }
          ]
        }));
        
        // All tokens must match (AND condition)
        recipes = await mongo.recipes.find({
          $and: regexConditions
        }).limit(maxResults).sort({ date_last_used: -1 }).toArray();
      } else {
        // Return recent recipes if no search query
        recipes = await mongo.recipes.find({}).limit(maxResults).sort({ date_last_used: -1 }).toArray();
      }
      
      res.json(recipes);
    } catch (error) {
      console.error("Error searching recipes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /recipes/:id - Get a specific recipe by ID or name
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let recipe;

      // Try to get by ObjectId first
      if (ObjectId.isValid(id)) {
        recipe = await mongo.recipes.findOne({ _id: new ObjectId(id) });
      }
      
      // If not found by ID, try by name
      if (!recipe) {
        recipe = await mongo.getRecipeByName(id);
      }

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /recipes - Create a new recipe
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { name, foods, steps, portions } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: "Recipe name is required" });
      }

      if (!Array.isArray(foods)) {
        return res.status(400).json({ error: "Foods must be an array" });
      }

      if (!steps || typeof steps !== 'string') {
        return res.status(400).json({ error: "Steps are required" });
      }

      if (!portions || typeof portions !== 'number' || portions <= 0) {
        return res.status(400).json({ error: "Portions must be a positive number" });
      }

      // Check if recipe with this name already exists
      const existingRecipe = await mongo.getRecipeByName(name.trim());
      if (existingRecipe) {
        return res.status(400).json({ error: "Recipe with this name already exists" });
      }

      // Validate foods array
      for (const food of foods) {
        if (!food.title || typeof food.title !== 'string') {
          return res.status(400).json({ error: "Each food must have a title" });
        }
        if (typeof food.kcal !== 'number' || food.kcal < 0) {
          return res.status(400).json({ error: "Each food must have valid calories" });
        }
        if (typeof food.weight !== 'number' || food.weight <= 0) {
          return res.status(400).json({ error: "Each food must have valid weight" });
        }
      }

      // Calculate total calories
      const total_kcal = calculateTotalKcal(foods);

      // Create the recipe
      const recipeData: Omit<Recipe, '_id'> = {
        name: name.trim(),
        foods: foods,
        steps: steps.trim(),
        portions: portions,
        total_kcal: total_kcal,
        date_created: new Date(),
        date_last_used: new Date()
      };

      const newRecipe = await mongo.createRecipe(recipeData);
      res.status(201).json(newRecipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /recipes/:id - Update a recipe
  router.put("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, foods, steps, portions } = req.body;

      // Find the recipe
      let recipe;
      if (ObjectId.isValid(id)) {
        recipe = await mongo.recipes.findOne({ _id: new ObjectId(id) });
      }
      if (!recipe) {
        recipe = await mongo.getRecipeByName(id);
      }

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      // Validation
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
          return res.status(400).json({ error: "Recipe name must be a non-empty string" });
        }
        
        // Check if another recipe with this name already exists
        const existingRecipe = await mongo.getRecipeByName(name.trim());
        if (existingRecipe && existingRecipe.name !== recipe.name) {
          return res.status(400).json({ error: "Recipe with this name already exists" });
        }
      }

      if (foods !== undefined) {
        if (!Array.isArray(foods)) {
          return res.status(400).json({ error: "Foods must be an array" });
        }
        
        // Validate foods array
        for (const food of foods) {
          if (!food.title || typeof food.title !== 'string') {
            return res.status(400).json({ error: "Each food must have a title" });
          }
          if (typeof food.kcal !== 'number' || food.kcal < 0) {
            return res.status(400).json({ error: "Each food must have valid calories" });
          }
          if (typeof food.weight !== 'number' || food.weight <= 0) {
            return res.status(400).json({ error: "Each food must have valid weight" });
          }
        }
      }

      if (steps !== undefined && (typeof steps !== 'string')) {
        return res.status(400).json({ error: "Steps must be a string" });
      }

      if (portions !== undefined && (typeof portions !== 'number' || portions <= 0)) {
        return res.status(400).json({ error: "Portions must be a positive number" });
      }

      // Prepare updates
      const updates: Partial<Omit<Recipe, '_id' | 'name'>> = {};
      
      if (foods !== undefined) {
        updates.foods = foods;
        updates.total_kcal = calculateTotalKcal(foods);
      }
      
      if (steps !== undefined) {
        updates.steps = steps.trim();
      }
      
      if (portions !== undefined) {
        updates.portions = portions;
      }

      // Update the recipe
      const updatedRecipe = await mongo.updateRecipe(recipe.name, updates);
      
      // If name changed, we need to handle it separately since name is part of the key
      if (name !== undefined && name.trim() !== recipe.name) {
        // Delete old recipe and create new one with new name
        await mongo.deleteRecipe(recipe.name);
        const newRecipeData: Omit<Recipe, '_id'> = {
          name: name.trim(),
          foods: updatedRecipe?.foods || recipe.foods,
          steps: updatedRecipe?.steps || recipe.steps,
          portions: updatedRecipe?.portions || recipe.portions,
          total_kcal: updatedRecipe?.total_kcal || recipe.total_kcal,
          date_created: recipe.date_created,
          date_last_used: new Date()
        };
        const newRecipe = await mongo.createRecipe(newRecipeData);
        res.json(newRecipe);
      } else {
        res.json(updatedRecipe);
      }
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /recipes/:id - Delete a recipe
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let recipe;

      // Find the recipe first
      if (ObjectId.isValid(id)) {
        recipe = await mongo.recipes.findOne({ _id: new ObjectId(id) });
      }
      if (!recipe) {
        recipe = await mongo.getRecipeByName(id);
      }

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      // Delete the recipe
      const deleted = await mongo.deleteRecipe(recipe.name);
      if (deleted) {
        res.json({ message: "Recipe deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete recipe" });
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
