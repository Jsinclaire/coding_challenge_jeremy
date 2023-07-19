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
I chose this design pattern because it allows to scale the system by adding more workers to consume the data from the queue and store it in the database.
The primary queue also allows to ingest large amounts of data without blocking the main node app.
I chose MongoDB because it allows to index the data and store Solana account objects easily.
I chose the package 'bull' because it uses redis as a queue system, which allow very fast reads and writes, because the data is stored in memory.

A description of what observability you would add if this was a production system.

In a production system I would verify each function with unit tests, implement integration tests and end to end tests.
In a production system I would also add a logging system to log errors and debug information.
I would use a more refined scheduling mechanism like a priority queue.
I would use a relational database like postgresql for the queries if I needed to make more complex queries.

What would you monitor for a production rollout?

I would monitor the system with a monitoring tool like datadog or with AWS cloudwatch dashboards and alarms.
I would monitor the queue system to ensure that the data is being consumed and stored in the database.
I would monitor the database and the database metrics to ensure that the database has enough resources to handle the load.
I would monitor the CPU and memory usage of the system to ensure that the system has enough resources to handle the load.

TODO:


add tests with Jest
add TS?
replace mongodb with postgresql?
refactor main.js -> too many if statements
