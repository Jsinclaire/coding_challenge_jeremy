Instructions on how to run and test your code in a local environment.

You need to have node.js v.16 installed. https://nodejs.org/en/download
You need to have docker installed. https://docs.docker.com/engine/install/
You need to have docker-compose installed. https://docs.docker.com/compose/install/
You need to run the app in a linux environment.

Commands to run to install and initialize the program:
-git pull git@github.com:Jsinclaire/coding_challlenge.git
-npm install
-npm run init

To run the program:
Run the first console - IMPORTANT -> run this command first:
-npm run start

 Note: The highest token-value accounts by parent_program_subtype printing will be displayed in the first console after the accounts have stopped coming trough.

Run the second console - IMPORTANT -> run the command in a second console - to start simulating a blockchain node, and stream data updates continuously:
-npm run create-stream

Note: if you want to re-run the program you need to drop the mongodb solanaAccounts collection and re-run npm run init

Description of how I chose the design patterns I did:

To simulate a constant stream of Solana accounts I created a stream of data from the json file and pushed it to a redis based queue system (bull) that is consumed by the main node app.
The main node app reads the data from the queue and stores it in a secondary queue with a scheduling mechanism.
A third process named "worker" consumes the data from the secondary queue and stores the data in a mongodb database.
The mongodb is used to execute fast queries on indexed fields to retrieve the data later.

Description of why I chose the design patterns I did:

Maintaining a priority queue or a scheduled task mechanism is an important part of handling callbacks in a real-time system.
I used the solid package 'bull' to implement a scheduled task mechanism.
This mechanism ensures that callbacks are executed in the correct order based on their scheduled time.
I chose this design pattern because it allows to scale the system by adding more workers to consume the data from the queue - it is possible to scale the system easily with heavy jobs running in parallel.
The primary queue also allows to ingest large amounts of data without blocking the main node app.
I chose MongoDB because it allows to index the data and store Solana account objects easily where the objects have different structure.
I chose the package 'bull' because it uses redis as a queue system, which allow very fast reads and writes (the data is stored in memory).

A description of what observability you would add if this was a production system.

In a production system I would verify each function with unit tests, implement integration tests and end to end tests.
In a production system I would also add a logging system to log errors and debug information.
I would use a more refined mechanism like a priority queue to allow fine grain control of the task priorities.
I would create a datalake to store objects with different schemas, with a parquet file system to process complex queries.

What would you monitor for a production rollout?

I would monitor the system with a monitoring tool like datadog or with AWS cloudwatch dashboards and alarms.
I would monitor the queue system to ensure that the data is being consumed and stored in the database.
I would monitor the database and the database metrics to ensure that the database has enough resources to handle the load.
I would monitor the CPU and memory usage of the system to ensure that the system has enough resources to handle the load.

TODO:

- Add tests with Jest
- Add TS?
- Refactor printData function.
- Refactor main.js -> too many if statements
- Add a better system for shutting down the program

Note: it is bad practice to commit the .env - only do it with test projects.
