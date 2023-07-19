import Bull from 'bull'
import { getMongoClient, connectToDatabase } from './helpers.js'
// The AccountProcessor class reads from the secondary queue ('solana-account-process'),
// and add jobs that become ready to process to the database, where values are indexed by the MongoDB database.

class AccountProcessor {
  constructor () {
    this.accountProcessQueue = new Bull('solana-account-process')
    this.myColl = null
  }

  async connectToDatabase () {
    await connectToDatabase()
    const client = await getMongoClient()
    this.myColl = client.collection('solanaAccounts')
  }

  async processAccountUpdates () {
    console.log('WORKER STARTED')
    try {
      await this.connectToDatabase()

      await this.accountProcessQueue.process(async (job, done) => {
        console.log(`THE ACCOUNT CALLBACK_TIME_MS_HAS EXPIRED ${job.data.id} ${job.data.version}`)

        if (!job.data) {
          throw new Error('No job data')
        }

        await this.myColl.insertOne(job.data)

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
}

// Start the program
(async () => {
  try {
    const accountProcessor = new AccountProcessor()
    const result = await accountProcessor.processAccountUpdates()
    console.log('worker process::result:', result)
    process.exit(0)
  } catch (error) {
    console.error('worker process::Error in main function:', error)
    process.exit(1)
  }
})()
