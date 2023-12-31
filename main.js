import Bull from 'bull'
import { getMongoClient, connectToDatabase, sleep } from './helpers.js'
const mainFunctionSleep = process.env.MAIN_FUNCTION_SLEEP
const mainFunctionTick = process.env.MAIN_FUNCTION_TICK
const waitBeforePrint = process.env.WAIT_BEFORE_PRINT

// Real-time system that processes a live stream of account updates
// The AccountProcessor class reads the stream of data from the primary queue ('solana-account-stream'),
// schedule a job if needed and cancel jobs if needed in the secondary queue ('solana-account-process').
// The AccountDataPrinter is responsible for computing the query that runs after the accounts have stopped coming trough.

class AccountProcessor {
  constructor (accountStreamQueueName, accountProcessQueueName) {
    this.accountStreamQueue = new Bull(accountStreamQueueName)
    this.accountProcessQueue = new Bull(accountProcessQueueName)
    this.tick = 0
    this.mainFunctionSleep = mainFunctionSleep
    this.mainFunctionTick = mainFunctionTick
  }

  async processAccountUpdatesStream () {
    console.log('MAIN PROCESS STARTED')

    do {
      const waitingJobs = await this.accountStreamQueue.getJobs(['waiting'])

      if (waitingJobs.length > 0) {
        const job = waitingJobs[waitingJobs.length - 1]
        await job.remove()
        const isIsIncomingDataCorrupted = job.data.version === undefined

        if (isIsIncomingDataCorrupted) {
          console.log('CORRUPTED DATA IN JOB - DISCARDING DATA', job.data.id)
        }

        if (!isIsIncomingDataCorrupted) {
          const accountProcessJobs = await this.accountProcessQueue.getJobs(['delayed'])
          const isProcessesRunning = accountProcessJobs.length > 0

          if (!isProcessesRunning) {
            console.log('NO PROCESS RUNNING CURRENTLY - ADDING THE JOB TO PROCESSING - VERSION', job.data.version, 'ID', job.data.id)
            await this.accountProcessQueue.add(job.data, { delay: job.data.callbackTimeMs })
          }

          if (isProcessesRunning) {
            const processingJobs = accountProcessJobs.filter((item) => item.data.id === job.data.id && item.data.parentProgramSubType === job.data.parentProgramSubType) || []
            let skipCycle = false

            if (processingJobs.length === 0) {
              await this.accountProcessQueue.add(job.data, { delay: job.data.callbackTimeMs })
              skipCycle = true
            }

            if (!skipCycle) {
              const orderedProcessingJobs = processingJobs.sort((a, b) => a.data.version - b.data.version)
              const processingJob = orderedProcessingJobs[orderedProcessingJobs.length - 1]
              const isNewVersion = processingJob.data.version < job.data.version

              if (isNewVersion) {
                console.log('CANCEL THE OLD JOB + SCHEDULE A NEW ONE - VERSION', processingJob.data.version, 'ID', processingJob.data.id)
                const toRemove = await this.accountProcessQueue.getJob(processingJob.id)

                try {
                  await toRemove.remove()
                } catch (error) {
                  console.log('ERROR REMOVING JOB', error)
                }

                await this.accountProcessQueue.add(job.data, { delay: job.data.callbackTimeMs })
              }

              if (!isNewVersion) {
                console.log('AN OLD VERSION OF THE ACCOUNT IS INGESTED - IGNORE THE UPDATE', processingJob.data.version, 'ID', processingJob.data.id)
              }
            }
          }
        }
      }

      this.tick++
      await sleep(this.mainFunctionSleep)
    } while (this.tick < this.mainFunctionTick)

    return 'Shutting down the system gracefully'
  }
}

class AccountDataPrinter {
  constructor () {
    this.parentProgramSubTypes = []
    this.latestVersion = []
  }

 // Note: The printData function would be much smaller if we used a relational database be we would lose the flexibility of mongoDB.
  async printData () {
    console.log('PRINT DATA STARTED')

    try {
      await connectToDatabase()
      const client = await getMongoClient()
      const myColl = client.collection('solanaAccounts')
      this.parentProgramSubTypes = await myColl.distinct('parentProgramSubType')

      for (const parentProgramSubType of this.parentProgramSubTypes) {
        const accountsOfOneParentProgramSubType = await myColl.find({ parentProgramSubType }).toArray()
        const distinctAccounts = [...new Set(accountsOfOneParentProgramSubType.map(item => item.id))]

        for (const id of distinctAccounts) {
          const account = accountsOfOneParentProgramSubType.filter(item => item.id === id).sort((a, b) => a.version - b.version)
          const lastVersion = account[account.length - 1]
          this.latestVersion.push(lastVersion)
        }
      }

      this.parentProgramSubTypes.forEach((item) => {
        const version = this.latestVersion.filter(item2 => item2.parentProgramSubType === item).sort((a, b) => a.tokens - b.tokens)

        if (version.length > 1) {
          const highest = version[version.length - 1]
          console.log('highestToken accounts by parentProgramSubType', highest.parentProgramSubType, 'token', highest.tokens, 'id', highest.id, 'version', highest.version)
        }

        if (version.length === 1) {
          console.log('highest token accounts by parent programS subtype. parentProgramSubType:', version[0].parentProgramSubType, 'token:', version[0].tokens, 'id:', version[0].id, 'version:', version[0].version)
        }
      })
    } catch (error) {
      console.error('main process::An error occurred:', error)
      return error
    } finally {
      const db = await getMongoClient()
      await db.client.close()
    }
  }
}

// Start the program
(async () => {
  try {
    const accountProcessor = new AccountProcessor('solana-account-stream', 'solana-account-process')
    const result = await accountProcessor.processAccountUpdatesStream()

    await sleep(waitBeforePrint)

    const accountDataPrinter = new AccountDataPrinter()
    await accountDataPrinter.printData()

    console.log('Main process::result', result)
    process.exit(0)
  } catch (error) {
    console.error('Main process::Error in main function:', error)
    process.exit(1)
  }
})()
