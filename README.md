## This is a reporting tool for Leslie's Poolmart's ecommerce.

## instructions

1. clone repo
2. navigate to manhattan-utilities/Scripts/reporting
3. open .env.sample and set variables to match MAO db location and credentials
4. copy .env.sample and to .env
5. open connection.js and update line 9. if remote, the value of 'host' should be 'process.env.DB_IP', if in office, the value should be 'process.env.DB_URL'
6. run
   npm install
7. run
   node gbg/index
8. wait... current run time for this application is about 7 minutes, most of the run time is attributed to SQL

the gbg report will be printed to a local file called "GBG.xlsx", which can be opened and edited as needed.

## known issues

currently gbg report does not include orderImport or JDA because I do not have access to those databases.
all queries are based on SCI report queries, logic for deriving specific numbers that are applied to the report
should mimic the current manual processes executed by Mark Barron, Jin Soo Kim, Ashley Esterline, and Praise Olukilede

## support

ddenney@lesl.com
