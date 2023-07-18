import fs from 'fs'
import { getRandomDelay, sleep } from './helpers.js'
import Bull from 'bull'

// Read account updates from a JSON file
function readAccountUpdates (filePath) {
  const accountUpdates = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(accountUpdates)
}

async function processAccount (account) {
  const accountStreamQueue = new Bull('solana-account-stream')

  return accountStreamQueue.add(account)
}

// Main function
async function createAccountUpdatesStream () {
  try {
    // Read account updates from a JSON file
    const accountUpdates = readAccountUpdates('coding-challenge-input.json')

    // Spawn a new process for each account update in a uniform random time interval
    let i = 0
    for (const accountUpdate of accountUpdates) {
      const delay = getRandomDelay(0, 1000)
      await sleep(delay)
      console.log(`create account stream::account stream: ${i} of ${accountUpdates.length}`, 'id', accountUpdate.id, 'version', accountUpdate.version)

      await processAccount(accountUpdate)

      i++
    }
  } catch (error) {
    console.error('create account stream::An error occurred:', error)
  }

  return 'Shutting down the system'
}

// Start the program

(async () => {
  try {
    const result = await createAccountUpdatesStream()
    console.log('create account stream::Main function result:', result)
    process.exit(0)
  } catch (error) {
    console.error('create account stream::Error in main function:', error)
    process.exit(1)
  }
})()
