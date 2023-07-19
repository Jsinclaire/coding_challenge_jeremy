import fs from 'fs';
import { getRandomDelay, sleep } from './helpers.js';
import Bull from 'bull';

class AccountUpdater {
  constructor(filePath) {
    this.filePath = filePath;
    this.accountStreamQueue = new Bull('solana-account-stream');
  }

  readAccountUpdates() {
    const accountUpdates = fs.readFileSync(this.filePath, 'utf-8');
    return JSON.parse(accountUpdates);
  }

  async processAccount(account) {
    return this.accountStreamQueue.add(account);
  }

  async createAccountUpdatesStream() {
    try {
      const accountUpdates = this.readAccountUpdates();

      let i = 0;
      for (const accountUpdate of accountUpdates) {
        const delay = getRandomDelay(0, 1000);
        await sleep(delay);
        console.log(`create account stream::account stream: ${i} of ${accountUpdates.length}`, 'id', accountUpdate.id, 'version', accountUpdate.version);

        await this.processAccount(accountUpdate);

        i++;
      }
    } catch (error) {
      console.error('create account stream::An error occurred:', error);
    }

    return 'Shutting down the system';
  }
}

// Start the program
(async () => {
  try {
    const accountUpdater = new AccountUpdater('coding-challenge-input.json');
    const result = await accountUpdater.createAccountUpdatesStream();
    console.log('create account stream::Main function result:', result);
    process.exit(0);
  } catch (error) {
    console.error('create account stream::Error in main function:', error);
    process.exit(1);
  }
})();
