const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aea2zks.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const productssCollection = client.db("techBuzzDB").collection("productsss");
    const trendingCollection = client.db("techBuzzDB").collection("trendings");

    // products apis

    // get all submitted assignment by Specefic User
    app.get("/products", async (req, res) => {
      const result = await productssCollection.find().toArray();
      res.send(result);
    });

    app.get("/products/:email", async (req, res) => {
      const email = req.params.email;
      const query = { 'Owner.email': email };
      const result = await productssCollection.find(query).toArray();
      res.send(result);
    });

    
    app.get("/productss/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productssCollection.findOne(query);
      res.send(result);
    });

    app.post("/products", async (req, res) => {
      const productData = req.body;
      const result = await productssCollection.insertOne(productData);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productssCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const productData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDocs = {
        $set: {
          ...productData,
        },
      };
      const result = await productssCollection.updateOne(
        query,
        updateDocs,
        options
      );
      res.send(result);
    });

    app.get("/featuredProducts", async (req, res) => {
      const query = { isFeatured: true };
      const result = await productssCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/products/:id/vote", async (req, res) => {
      const { id } = req.params;
      const result = await productssCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { votes: +1 } },
        { returnOriginal: false }
      );
      res.send(result.value);
    });

    // trendings apis
    app.get("/trendingsProducts", async (req, res) => {
      const result = await trendingCollection.find().toArray();
      res.send(result);
    });

    app.post("/trendingProducts/:id/vote", async (req, res) => {
      const { id } = req.params;
      const result = await trendingCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { votes: +1 } },
        { returnOriginal: false }
      );
      res.send(result.value);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Tech Buzz server is running");
});
app.listen(port, () => {
  console.log(`Tech Buzz running on port ${port}`);
});
