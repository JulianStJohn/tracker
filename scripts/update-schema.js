import { MongoClient } from "mongodb";
import "dotenv/config";


async function updateSchema() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    console.log('Connected to MongoDB');
    
    // Update the food collection validation
    const result = await db.command({
      collMod: 'food',
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["name", "kcal_per_100g", "is_ingredient"],
          additionalProperties: false,
          properties: {
            _id: { bsonType: "objectId" },      
            name: { bsonType: "string", description: "Food name (required)" },
            brand: { bsonType: "string", description: "Food brand (optional)" },
            kcal_per_100g: { bsonType: ["int", "double"], description: "Calories per 100g (required)" },
            is_ingredient: { bsonType: "bool", description: "Whether this is an ingredient (required)" },
            quantities: {
              bsonType: "array",
              description: "Array of quantity options (optional)",
              items: {
                bsonType: "object",
                required: ["name", "weight"],
                properties: {
                  name: { bsonType: "string", description: "Quantity name (required)" },
                  weight: { bsonType: ["int", "double"], description: "Weight in grams (required)" }
                }
              }
            }
          }
        }
      }
    });
    
    console.log('Schema update result:', result);
    
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await client.close();
  }
}

updateSchema();
