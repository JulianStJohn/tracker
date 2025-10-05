const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateSchema() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    console.log('Connected to MongoDB');
    
    // First, let's check the current validator
    const collections = await db.listCollections({ name: 'food' }).toArray();
    console.log('Current food collection info:', JSON.stringify(collections[0], null, 2));
    
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
    
    // Verify the update by checking the collection info again
    const updatedCollections = await db.listCollections({ name: 'food' }).toArray();
    console.log('Updated food collection info:', JSON.stringify(updatedCollections[0], null, 2));
    
    // Test inserting a document with empty quantities
    console.log('Testing insert with empty quantities...');
    const testDoc = {
      name: "Test Food " + Date.now(),
      brand: "",
      kcal_per_100g: 100,
      is_ingredient: true,
      quantities: []
    };
    
    try {
      const insertResult = await db.collection('food').insertOne(testDoc);
      console.log('Test insert successful:', insertResult.insertedId);
      
      // Clean up test document
      await db.collection('food').deleteOne({ _id: insertResult.insertedId });
      console.log('Test document cleaned up');
    } catch (insertError) {
      console.error('Test insert failed:', insertError);
    }
    
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await client.close();
  }
}

updateSchema();
