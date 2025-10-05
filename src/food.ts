import { Router, Request, Response } from "express";
import { MongoStore } from "./mongo";
import { Food } from "./types/collections.js";

export function makeFoodRouter(mongo: MongoStore): Router {
  const router = Router();

  // GET /food/search - Search foods by name
  router.get("/search", async (req: Request, res: Response) => {
    try {
      const { q, limit } = req.query;
      const searchQuery = typeof q === 'string' ? q : '';
      const maxResults = typeof limit === 'string' ? parseInt(limit) || 10 : 10;
      
      let foods;
      if (searchQuery) {
        // Search by name (case-insensitive)
        foods = await mongo.foods.find(
          { name: { $regex: searchQuery, $options: 'i' } }
        ).limit(maxResults).sort({ name: 1 }).toArray();
      } else {
        // Return all foods if no search query
        foods = await mongo.foods.find({}).limit(maxResults).sort({ name: 1 }).toArray();
      }
      
      res.json(foods);
    } catch (error) {
      console.error("Error searching foods:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /food/export - Export all foods as JSON
  router.get("/export", async (req: Request, res: Response) => {
    try {
      const foods = await mongo.foods.find({}).sort({ name: 1 }).toArray();
      
      // Convert to export format (remove MongoDB _id field)
      const exportData = foods.map(food => {
        const { _id, ...exportFood } = food;
        return exportFood;
      });
      
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting foods:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /food/import - Import foods from JSON (replaces all existing foods)
  router.post("/import", async (req: Request, res: Response) => {
    try {
      const { foods } = req.body;
      
      if (!Array.isArray(foods)) {
        return res.status(400).json({ error: "Foods must be an array" });
      }
      
      if (foods.length === 0) {
        return res.status(400).json({ error: "No foods provided" });
      }
      
      // Validate each food item
      const validationErrors: string[] = [];
      
      for (let i = 0; i < foods.length; i++) {
        const food = foods[i];
        const foodIdentifier = food.name ? `"${food.name}"${food.brand ? ` (${food.brand})` : ''}` : `item ${i + 1}`;
        
        // Check if food is null/undefined
        if (!food || typeof food !== 'object') {
          validationErrors.push(`Food item ${i + 1}: must be an object (got: ${typeof food})`);
          continue;
        }
        
        // Validate name
        if (!food.name || typeof food.name !== 'string' || food.name.trim() === '') {
          validationErrors.push(`Food ${foodIdentifier}: name is required and must be a non-empty string (got: ${typeof food.name === 'string' ? `"${food.name}"` : food.name})`);
          continue; // Skip rest of validation if no valid name
        }
        
        // Validate kcal_per_100g
        if (food.kcal_per_100g === null || food.kcal_per_100g === undefined) {
          validationErrors.push(`Food ${foodIdentifier}: kcal_per_100g is required (got: ${food.kcal_per_100g})`);
        } else if (typeof food.kcal_per_100g !== 'number' || isNaN(food.kcal_per_100g)) {
          validationErrors.push(`Food ${foodIdentifier}: kcal_per_100g must be a number (got: ${food.kcal_per_100g} of type ${typeof food.kcal_per_100g})`);
        } else if (food.kcal_per_100g < 0) {
          validationErrors.push(`Food ${foodIdentifier}: kcal_per_100g must be non-negative (got: ${food.kcal_per_100g})`);
        }
        
        // Set defaults for optional fields and validate
        if (food.brand !== undefined && typeof food.brand !== 'string') {
          validationErrors.push(`Food ${foodIdentifier}: brand must be a string if provided (got: ${typeof food.brand})`);
          food.brand = '';
        } else if (typeof food.brand !== 'string') {
          food.brand = '';
        }
        
        if (food.is_ingredient !== undefined && typeof food.is_ingredient !== 'boolean') {
          validationErrors.push(`Food ${foodIdentifier}: is_ingredient must be a boolean if provided (got: ${typeof food.is_ingredient})`);
          food.is_ingredient = true;
        } else if (typeof food.is_ingredient !== 'boolean') {
          food.is_ingredient = true;
        }
        
        // Validate quantities array
        if (food.quantities !== undefined && !Array.isArray(food.quantities)) {
          validationErrors.push(`Food ${foodIdentifier}: quantities must be an array if provided (got: ${typeof food.quantities})`);
          food.quantities = [];
        } else if (!Array.isArray(food.quantities)) {
          food.quantities = [];
        }
        
        // Validate each quantity
        for (let j = 0; j < food.quantities.length; j++) {
          const quantity = food.quantities[j];
          
          if (!quantity || typeof quantity !== 'object') {
            validationErrors.push(`Food ${foodIdentifier}, quantity ${j + 1}: must be an object (got: ${typeof quantity})`);
            continue;
          }
          
          if (!quantity.name || typeof quantity.name !== 'string' || quantity.name.trim() === '') {
            validationErrors.push(`Food ${foodIdentifier}, quantity ${j + 1}: name is required and must be a non-empty string (got: ${quantity.name})`);
          }
          
          if (quantity.weight === null || quantity.weight === undefined) {
            validationErrors.push(`Food ${foodIdentifier}, quantity ${j + 1} ("${quantity.name || 'unnamed'}"): weight is required (got: ${quantity.weight})`);
          } else if (typeof quantity.weight !== 'number' || isNaN(quantity.weight)) {
            validationErrors.push(`Food ${foodIdentifier}, quantity ${j + 1} ("${quantity.name || 'unnamed'}"): weight must be a number (got: ${quantity.weight} of type ${typeof quantity.weight})`);
          } else if (quantity.weight <= 0) {
            validationErrors.push(`Food ${foodIdentifier}, quantity ${j + 1} ("${quantity.name || 'unnamed'}"): weight must be positive (got: ${quantity.weight})`);
          }
        }
      }
      
      // If there are validation errors, return them all
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationErrors.slice(0, 10), // Limit to first 10 errors to avoid overwhelming response
          totalErrors: validationErrors.length
        });
      }
      
      // Count existing foods for response
      const existingCount = await mongo.foods.countDocuments({});
      
      // Clear all existing foods and insert new ones
      await mongo.foods.deleteMany({});
      const insertResult = await mongo.foods.insertMany(foods);
      
      res.json({ 
        imported: insertResult.insertedCount,
        replaced: existingCount,
        message: `Successfully imported ${insertResult.insertedCount} foods, replacing ${existingCount} existing foods`
      });
      
    } catch (error) {
      console.error("Error importing foods:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          // Extract which key is duplicated from the error
          const match = error.message.match(/dup key: { (.+) }/);
          const duplicateInfo = match ? match[1] : 'unknown field';
          res.status(400).json({ error: `Import failed: Duplicate food names found - ${duplicateInfo}` });
        } else if (error.message.includes('Document failed validation')) {
          // Try to extract more specific validation info
          const errorDetails = error.message;
          res.status(400).json({ 
            error: "Import failed: Database validation error", 
            details: errorDetails,
            suggestion: "Check that all required fields (name, kcal_per_100g) are present and correctly formatted"
          });
        } else if (error.message.includes('validation')) {
          res.status(400).json({ error: `Import failed: Validation error - ${error.message}` });
        } else {
          res.status(500).json({ error: `Import failed: ${error.message}` });
        }
      } else {
        res.status(500).json({ error: "Import failed: Unknown error occurred" });
      }
    }
  });

  // GET /food/:id - Get a specific food by ID
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Try to find by MongoDB ObjectId
      let food;
      try {
        const { ObjectId } = await import('mongodb');
        food = await mongo.foods.findOne({ _id: new ObjectId(id) });
      } catch (objectIdError) {
        // If ObjectId conversion fails, try finding by name
        food = await mongo.getFoodByName(id);
      }

      if (!food) {
        return res.status(404).json({ error: "Food not found" });
      }

      res.json(food);
    } catch (error) {
      console.error("Error fetching food:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /food - Create a new food
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { name, brand, kcal_per_100g, is_ingredient, quantities } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "Food name is required" });
      }

      if (!kcal_per_100g || typeof kcal_per_100g !== 'number' || kcal_per_100g <= 0) {
        return res.status(400).json({ error: "Valid calories per 100g is required" });
      }

      // Default to empty array if quantities is not provided
      const validQuantities = Array.isArray(quantities) ? quantities : [];

      // Validate quantities (only if they exist)
      for (const quantity of validQuantities) {
        if (!quantity.name || typeof quantity.name !== 'string' || !quantity.name.trim()) {
          return res.status(400).json({ error: "All quantities must have a valid name" });
        }
        if (!quantity.weight || typeof quantity.weight !== 'number' || quantity.weight <= 0) {
          return res.status(400).json({ error: "All quantities must have a valid weight" });
        }
      }

      // Check if food with this name already exists
      const existingFood = await mongo.getFoodByName(name.trim());
      if (existingFood) {
        return res.status(409).json({ error: "A food with this name already exists" });
      }

      // Create the food
      const foodData: Omit<Food, '_id'> = {
        name: name.trim(),
        kcal_per_100g: Math.round(kcal_per_100g),
        is_ingredient: Boolean(is_ingredient),
        quantities: validQuantities.map(q => ({
          name: q.name.trim(),
          weight: Math.round(q.weight)
        }))
      };

      // Only include brand if it's a non-empty string
      if (brand && typeof brand === 'string' && brand.trim()) {
        foodData.brand = brand.trim();
      }

      const newFood = await mongo.createFood(foodData);
      res.status(201).json(newFood);

    } catch (error) {
      console.error("Error creating food:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /food/:id - Update an existing food
  router.put("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, brand, kcal_per_100g, is_ingredient, quantities } = req.body;

      console.log(`\n=== PUT /food/${id} ===`);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Quantities received:', quantities);
      console.log('Quantities type:', typeof quantities);
      console.log('Quantities is array:', Array.isArray(quantities));

      // Find the existing food first
      let existingFood;
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(id)) {
          existingFood = await mongo.foods.findOne({ _id: new ObjectId(id) });
        }
      } catch (objectIdError) {
        // Try finding by name if ObjectId fails
        existingFood = await mongo.getFoodByName(id);
      }

      if (!existingFood) {
        return res.status(404).json({ error: "Food not found" });
      }

      console.log('Found existing food:', JSON.stringify(existingFood, null, 2));

      // Validation (same as POST)
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "Food name is required" });
      }

      if (!kcal_per_100g || typeof kcal_per_100g !== 'number' || kcal_per_100g <= 0) {
        return res.status(400).json({ error: "Valid calories per 100g is required" });
      }

      // Default to empty array if quantities is not provided
      const validQuantities = Array.isArray(quantities) ? quantities : [];
      console.log('Valid quantities after processing:', validQuantities);
      console.log('Valid quantities length:', validQuantities.length);

      // Validate quantities (only if they exist)
      for (const quantity of validQuantities) {
        if (!quantity.name || typeof quantity.name !== 'string' || !quantity.name.trim()) {
          return res.status(400).json({ error: "All quantities must have a valid name" });
        }
        if (!quantity.weight || typeof quantity.weight !== 'number' || quantity.weight <= 0) {
          return res.status(400).json({ error: "All quantities must have a valid weight" });
        }
      }

      // Check if another food with this name exists (excluding current food)
      if (name.trim() !== existingFood.name) {
        const duplicateFood = await mongo.getFoodByName(name.trim());
        if (duplicateFood && duplicateFood._id.toString() !== existingFood._id.toString()) {
          return res.status(409).json({ error: "A food with this name already exists" });
        }
      }

      // Update the food
      const updateData: Partial<Omit<Food, '_id' | 'name'>> & { name?: string } = {
        name: name.trim(),
        kcal_per_100g: Math.round(kcal_per_100g),
        is_ingredient: Boolean(is_ingredient),
        quantities: validQuantities.map(q => ({
          name: q.name.trim(),
          weight: Math.round(q.weight)
        }))
      };

      // Only include brand if it's a non-empty string
      if (brand && typeof brand === 'string' && brand.trim()) {
        updateData.brand = brand.trim();
      }

      console.log('Update data being sent to MongoDB:', JSON.stringify(updateData, null, 2));
      console.log('Update data quantities:', updateData.quantities);
      console.log('Update data quantities length:', updateData.quantities?.length);

      // Use MongoDB's updateOne directly since we need to handle name changes
      console.log('About to call findOneAndUpdate...');
      const result = await mongo.foods.findOneAndUpdate(
        { _id: existingFood._id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      console.log('Update successful, result:', JSON.stringify(result, null, 2));

      if (!result) {
        return res.status(500).json({ error: "Failed to update food" });
      }

      res.json(result);

    } catch (error) {
      console.error("Error updating food:", error);
      
      // Provide more detailed error information
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        // Check for MongoDB validation errors
        if (error.message.includes('Document failed validation')) {
          console.error("MongoDB validation error detected");
          // Try to extract more details from the error object
          if ('errInfo' in error) {
            console.error("Error info:", JSON.stringify((error as any).errInfo, null, 2));
          }
          res.status(400).json({ 
            error: "Database validation failed", 
            details: error.message,
            suggestion: "Check that the document structure matches the database schema"
          });
        } else {
          res.status(500).json({ error: `Internal server error: ${error.message}` });
        }
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // DELETE /food/:id - Delete a food
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      let deleted = false;
      
      // Try to delete by ObjectId first
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(id)) {
          const result = await mongo.foods.deleteOne({ _id: new ObjectId(id) });
          deleted = result.deletedCount > 0;
        }
      } catch (objectIdError) {
        // If ObjectId fails, try deleting by name
        deleted = await mongo.deleteFood(id);
      }

      if (!deleted) {
        return res.status(404).json({ error: "Food not found" });
      }

      res.json({ message: "Food deleted successfully" });

    } catch (error) {
      console.error("Error deleting food:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
