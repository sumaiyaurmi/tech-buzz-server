const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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

    const productssCollection = client
      .db("techBuzzDB")
      .collection("productsss");
    const trendingCollection = client.db("techBuzzDB").collection("trendings");
    const userCollection = client.db("techBuzzDB").collection("users");
    const reviewsCollection = client.db("techBuzzDB").collection("reviews");
    const couponCollection = client.db("techBuzzDB").collection("coupons");
    const paymentCollection = client.db("techBuzzDB").collection("payments");

    // jwt api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res.send({ token });
    });

    //  middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        console.log(decoded);
        next();
      });
    };

    // verify ADmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // verify ADmin
    const verifyModerator = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isModerator = user?.role === "moderator";
      if (!isMOderator) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // user apis
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists:
      const query = { email: user.email };
      const exitingUser = await userCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // make admin
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateAdmin = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateAdmin);
        res.send(result);
      }
    );
    // make moderator
    app.patch(
      "/users/moderator/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateAdmin = {
          $set: {
            role: "moderator",
          },
        };
        const result = await userCollection.updateOne(filter, updateAdmin);
        res.send(result);
      }
    );

    // products apis
    app.get("/products", verifyToken, verifyModerator, async (req, res) => {
      const result = await productssCollection.find().toArray();
      res.send(result);
    });

    // all products api
    app.get("/allProducts", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const filter = req.query;
      console.log(filter);
      const query = {
        status: "accepted",
        tags: { $regex: filter.search, $options: "i" },
      };
      const result = await productssCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/products/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "Owner.email": email };
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

    // update products status
    app.patch("/users/status/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      console.log(status);
      const query = { _id: new ObjectId(id) };
      const updateDocs = {
        $set: {
          ...status,
        },
      };
      const result = await productssCollection.updateOne(query, updateDocs);
      res.send(result);
    });
    // update products status
    app.patch("/productsFeatured/:id", async (req, res) => {
      const id = req.params.id;
      const isFeatured = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDocs = {
        $set: {
          ...isFeatured,
        },
      };
      const result = await productssCollection.updateOne(query, updateDocs);
      res.send(result);
    });

    // report
    app.patch("/productsReport/:id", async (req, res) => {
      const id = req.params.id;
      const reported = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDocs = {
        $set: {
          ...reported,
        },
      };
      const result = await productssCollection.updateOne(query, updateDocs);
      res.send(result);
    });
    // get report products
    app.get("/ReportedProducts", async (req, res) => {
      const query = { reported: true };
      const result = await productssCollection.find(query).toArray();
      res.send(result);
    });

    // review get
    app.get("/allReviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { productId: id };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });

    // review post
    app.post("/productsReview", async (req, res) => {
      const reviewData = req.body;
      const result = await reviewsCollection.insertOne(reviewData);
      res.send(result);
    });

    // featured product get
    app.get("/featuredProducts", async (req, res) => {
      const filter = req.query;
      console.log(filter);
      const query = { isFeatured: true };
      const options = {
        sort: {
          timestamp: filter.sort === "asc" ? 1 : -1,
        },
      };
      const result = await productssCollection.find(query, options).toArray();
      res.send(result);
    });

    // vote
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
      const filter = req.query;
      console.log(filter);
      const query = {};
      const options = {
        sort: {
          votes: filter.sort === "asc" ? 1 : -1,
        },
      };
      const result = await trendingCollection.find(query, options).toArray();
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

    // admin states
    app.get("/admin-stats", verifyToken, verifyModerator, async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const products = await productssCollection.estimatedDocumentCount();
      const reviews = await reviewsCollection.estimatedDocumentCount();

      res.send({
        users,
        products,
        reviews,
      });
    });

    //  coupon apis
    app.get("/coupons", verifyToken, verifyAdmin, async (req, res) => {
      const result = await couponCollection.find().toArray();
      res.send(result);
    });
    app.post("/coupons", verifyToken, verifyAdmin, async (req, res) => {
      const couponData = req.body;
      const result = await couponCollection.insertOne(couponData);
      res.send(result);
    });
    app.get("/coupons/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await couponCollection.findOne(query);
      res.send(result);
    });
    app.put("/coupons/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const couponData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDocs = {
        $set: {
          ...couponData,
        },
      };
      const result = await couponCollection.updateOne(
        query,
        updateDocs,
        options
      );
      res.send(result);
    });

    app.delete("/coupon/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await couponCollection.deleteOne(query);
      res.send(result);
    });

    // payment apis
    app.post("/create-payment-intent", async (req, res) => {
      const { price, coupon_code } = req.body;
      let discountPercent = 0;
      const couponCode = await couponCollection.findOne({ coupon_code });
      if (couponCode) {
        discountPercent = couponCode.amount;
      }
      const amount = price * 100;
      const discountAmount = (amount * discountPercent) / 100;
      let discountedAmount = amount - discountAmount;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(discountedAmount),
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
        discountPercent,
        discountedAmount: discountedAmount / 100,
      });
    });
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      res.send(paymentResult);
    });
    app.get("/payment/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await paymentCollection.findOne(query);
      res.send(result);
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
