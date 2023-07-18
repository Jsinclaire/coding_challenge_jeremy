import dotenv from 'dotenv'
import 'dotenv/config'
import { MongoClient } from 'mongodb'

export const getMongoClient = function () {
  const uri = dotenv.config().parsed.DB_MONGO_DSN
  const dbName = dotenv.config().parsed.DB_NAME

  const client = new MongoClient(uri)

  return client.db(dbName)
}

export const connectToDatabase = async function () {
  const uri = process.env.DB_MONGO_DSN

  const client = new MongoClient(uri)

  try {
    // Connect to the MongoDB cluster
    await client.connect()
    // Make the appropriate DB calls
  } catch (e) {
    console.error(e)
  }
}

// Function to simulate a continuous uniform distribution
export const getRandomDelay = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const sleep = async function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
