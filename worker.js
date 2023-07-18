import Bull from 'bull'
import { getMongoClient, connectToDatabase } from './helpers.js'

// Real-time system that store the accounts in the database after the CALLBACK_TIME_MS_HAS expired
async function main () {
  console.log('WORKER STARTED')
  try {
    const accountProcessQueue = new Bull('solana-account-process')
    await connectToDatabase()
    const client = await getMongoClient()
    const myColl = client.collection('solanaAccounts')

    // This function streams the account updates from the queue and stores them in the database where they are indexed
    await accountProcessQueue.process(async (job, done) => {
      console.log(`THE ACCOUNT CALLBACK_TIME_MS_HAS EXPIRED ${job.data.id} ${job.data.version}`)

      if (!job.data) { throw new Error('No job data') }

      await myColl.insertOne(job.data)

      console.log(`THE ACCOUNT HAS BEEN INDEXED ${job.data.id} ${job.data.version}`)
      done()
    })
  } catch (error) {
    console.error('worker process::An error occurred:', error)
    return error
  } finally {
    const db = await getMongoClient()
    await db.client.close()
  }

  return 'Shutting down the system gracefully'
}

// Start the program
main()
  .then((result) => {
    console.log('worker process::result:', result)
    process.exit(0)
  })
  .catch((error) => {
    console.error('worker process::Error in main function:', error)
    process.exit(1)
  })
