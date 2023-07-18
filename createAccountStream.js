import fs from 'fs'
import { getRandomDelay } from './helpers.js'
import Bull from 'bull'

// Read account updates from a JSON file
function readAccountUpdates (filePath) {
  const accountUpdates = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(accountUpdates)
}

async function processAccount (account) {
  const accountStreamQueue = new Bull('solana-account-stream')
  await accountStreamQueue.add(account)

  return null
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
      await new Promise((resolve) => setTimeout(resolve, delay))
      console.log(`account stream ${i} of ${accountUpdates.length}`, accountUpdate.id, accountUpdate.version)

      await processAccount(accountUpdate)
      // if (i===1) break
      i++
    }
  } catch (error) {
    console.error('An error occurred:', error)
  }

  return 'Shutting down the system'
}

// Function to process and log account updates

// Start the program
createAccountUpdatesStream()
  .then((result) => {
    console.log('Main function result:', result)
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error in main function:', error)
    process.exit(1)
  })
