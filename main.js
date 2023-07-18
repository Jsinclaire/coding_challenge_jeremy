import { sleep } from './helpers.js'
import Bull from 'bull'

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
      const job = waitingJobs[waitingJobs.length - 1]

      await job.remove()

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
            await toRemove.remove()

            // add the new job
            await accountProcessQueue.add(job.data, { delay: job.data.callbackTimeMs })
          }
          if (!isNewVersion) {
            console.log('AN OLD VERSION OF THE ACCOUNT IS INGESTED - IGNORE THE UPDATE', processingJob.data.version, 'ID', processingJob.data.id)
          }
        }
      }
    }
    tick++
    await sleep(1000)
  } while (tick !== 1000000)

  return null
}

// Main function
async function main () {
  try {
    await readAccountUpdatesStream()
  } catch (error) {
    console.error('main process::An error occurred:', error)
    return error
  }

  // SHUTTING DOWN THE SYSTEM GRACEFULLY

  return 'Shutting down the system gracefully'
}

// Start the program
main()
  .then((result) => {
    console.log('Main process::result', result)
    process.exit(0)
  })
  .catch((error) => {
    console.error('Main process::Error in main function:', error)
    process.exit(1)
  })
