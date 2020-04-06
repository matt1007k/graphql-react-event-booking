const express = require("express");
const bodyParser = require("body-parser");
const GraphQLHTTP = require("express-graphql");
const { buildSchema } = require("graphql");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Event = require("./models/event");
const User = require("./models/user");

const app = express();

app.use(bodyParser.json());

app.use(
  "/graphql",
  GraphQLHTTP({
    schema: buildSchema(
      `
        type Event{
          _id: ID!
          title: String!
          description: String!
          price: Float!
          date: String!
        }

        type User{
          _id: ID!
          email: String!
          password: String
        }

        input EventInput{
          title: String!
          description: String!
          price: Float!
          date: String!
        }

        input UserInput{
          email: String!
          password: String!
        }

        type rootQuery{
            events: [Event!]!
        }

        type rootMutation{
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }

        schema{
            query: rootQuery,
            mutation: rootMutation
        }
    `
    ),
    rootValue: {
      events: () => {
        return Event.find()
          .then(events => {
            return events.map(event => {
              return { ...event._doc, _id: event.id };
            });
          })
          .catch(err => {
            throw err;
          });
      },
      createEvent: args => {
        const event = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date),
          creator: "5e7d4a41a9f1b51d363cb62f"
        });
        let createEvent;
        return event
          .save()
          .then(result => {
            createEvent = { ...result._doc, _id: result._doc._id.toString() };
            return User.findById("5e7d4a41a9f1b51d363cb62f");
          })
          .then(user => {
            if (!user) {
              throw new Error("User not found");
            }
            user.createEvents.push(event);
            return user.save();
          })
          .then(result => {
            return createEvent;
          })
          .catch(err => {
            throw err;
          });
      },
      createUser: args => {
        const email = args.userInput.email;
        const password = args.userInput.password;
        return User.findOne({ email: email })
          .then(user => {
            if (user) {
              throw new Error("User exists already");
            }
            return bcrypt.hash(password, 12);
          })
          .then(hashedPassword => {
            const user = new User({
              email: email,
              password: hashedPassword
            });
            return user.save();
          })
          .then(result => {
            return { ...result._doc, password: null, _id: result.id };
          })
          .catch(err => {
            throw err;
          });
      }
    },
    graphiql: true
  })
);

mongoose
  .connect(
    `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ds261238.mlab.com:61238/${process.env.MONGO_DB}`
  )
  .then(() => {
    console.log(`DB ${process.env.MONGO_DB} connected`);
    app.listen(3000, () => {
      console.log(`Listen on http://localhost:3000`);
    });
  })
  .catch(err => console.log(err));
