import Bull from 'bull'
import { getMongoClient, connectToDatabase, sleep } from './helpers.js'
// Real-time system that processes a live stream of account updates

async function readAccountUpdatesStream () {
  console.log('MAIN PROCESS STARTED')
  const accountStreamQueue = new Bull('solana-account-stream')
  const accountProcessQueue = new Bull('solana-account-process')

  let tick = 0

  do {
    const waitingJobs = await accountStreamQueue.getJobs(['waiting'])

    // THERE IS AN INCOMING ACCOUNT
    if (waitingJobs.length > 0) {

      // get the last job
      const job = waitingJobs[waitingJobs.length - 1]

      await job.remove()
      if (job.data.version !== undefined) {
        console.log('CORRUPTED DATA IN JOB - DISCARDING DATA', job.data.id)

      // get running processes
      const accountProcessJobs = await accountProcessQueue.getJobs(['delayed'])

      const isProcessesRunning = accountProcessJobs.length > 0

      if (!isProcessesRunning) {
        console.log('NO PROCESS RUNNING CURRENTLY- ADDING THE JOB TO PROCESSING - VERSION', job.data.version, 'ID', job.data.id)
        await accountProcessQueue.add(job.data, { delay: job.data.callbackTimeMs })
      }

      if (isProcessesRunning) {
      // CHECK IF JOB IS ALREADY IN THE PROCESS QUEUE AND IF VERSION IS HIGHER
        const processingJobs = accountProcessJobs.filter((item) => item.data.id === job.data.id) || []
        let skipCycle = false

        if (processingJobs.length === 0) {
          await accountProcessQueue.add(job.data, { delay: job.data.callbackTimeMs })
          skipCycle = true
        }
        if (!skipCycle) {
          const orderedProcessingJobs = processingJobs.sort((a, b) => a.data.version - b.data.version)

          const processingJob = orderedProcessingJobs[orderedProcessingJobs.length - 1]

          const isNewVersion = processingJob.data.version < job.data.version

          if (isNewVersion) {
            console.log('CANCEL THE OLD JOB + SCHEDULE A NEW ONE - VERSION', processingJob.data.version, 'ID', processingJob.data.id)
            // cancel the old job
            const toRemove = await accountProcessQueue.getJob(processingJob.id)

            try {
             await toRemove.remove()
            } catch (error) {
            console.log('ERROR REMOVING JOB', error)
            }


            // add the new job
            await accountProcessQueue.add(job.data, { delay: job.data.callbackTimeMs })
          }
          if (!isNewVersion) {
            console.log('AN OLD VERSION OF THE ACCOUNT IS INGESTED - IGNORE THE UPDATE', processingJob.data.version, 'ID', processingJob.data.id)
          }
        }
      }
    }
  }
    tick++
    await sleep(100)
  } while (tick < 1200)

  return null
}

async function printData () {
  console.log('PRINT DATA STARTED')
  try {
    await connectToDatabase()
    const client = await getMongoClient()
    const myColl = client.collection('solanaAccounts')
    const parentProgramSubTypes = await myColl.distinct('parentProgramSubType')
    const latestVersion = []
    for (const parentProgramSubType of parentProgramSubTypes) {
      const accountsOfOneParentProgramSubType = await myColl.find({ parentProgramSubType }).toArray()
      const distinctAccounts = [...new Set(accountsOfOneParentProgramSubType.map(item => item.id))]
      for (const id of distinctAccounts) {
        const account = accountsOfOneParentProgramSubType.filter(item => item.id === id).sort((a, b) => a.version - b.version)

        const lastVersion = account[account.length - 1]
        latestVersion.push(lastVersion)
      }
    }

    parentProgramSubTypes.forEach( (item) => {
      const version = latestVersion
        .filter(item2 => item2.parentProgramSubType === item)
        .sort((a, b) => a.tokens - b.tokens)
        if (version.length > 1) {
          const highest = version[version.length - 1]
          console.log('highestToken accounts by parentProgramSubType',
            'parentProgramSubType', highest.parentProgramSubType,
            'token', highest.tokens,
            'id', highest.id,
            'version', highest.version)
        }
        if (version.length === 1){
          console.log('highestToken accounts by parentProgramSubType',
            'parentProgramSubType', version[0].parentProgramSubType,
            'token', version[0].tokens,
            'id', version[0].id,
            'version', version[0].version)
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

// Start the program
(async () => {
  try {
    const result = await readAccountUpdatesStream()
    await sleep(30000)
    await printData()
    console.log('Main process::result', result)
    process.exit(0)
  } catch (error) {
    console.error('Main process::Error in main function:', error)
    process.exit(1)
  }
})()
