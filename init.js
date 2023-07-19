import { connectToDatabase, getMongoClient } from './helpers.js'

// Initialization file to create a mongoDB collection and a compound index on the specified fields.

async function createCollection (db) {
  await db.createCollection('solanaAccounts')
}

// Display a short message log message to console when each (pubkey + slot + owner_subtype +
// write_version) tuple has been indexed. -> creating the index

async function createIndexes (db) {
  const collection = db.collection('solanaAccounts')
  const res = await collection.createIndex({ id: 1, tokens: 1, parentProgram: 1, version: 1 })
  console.log('created index', res)
}

async function main () {
  const db = getMongoClient()

  try {
    await connectToDatabase()

    await createCollection(db)

    await createIndexes(db)
  } catch (error) {
    console.error('An error occurred:', error)
  } finally {
    await db.client.close()
  }

  return 'project initialized'
}

// Start the program
(async () => {
  try {
    const result = await main()
    console.log('Main process::result', result)
    process.exit(0)
  } catch (error) {
    console.error('Main process::Error in main function:', error)
    process.exit(1)
  }
})()
